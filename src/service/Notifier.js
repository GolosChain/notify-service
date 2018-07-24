const core = require('gls-core-service');
const BasicService = core.service.Basic;
const Gate = core.service.Gate;
const logger = core.Logger;
const env = require('../Env');
const Event = require('../model/Event');

const MAX_HISTORY_LIMIT = 100;
const EVENT_TYPES = [
    'vote',
    'flag',
    'transfer',
    'reply',
    'subscribe',
    'unsubscribe',
    'mention',
    'repost',
    'award',
    'curatorAward',
    'message',
    'witnessVote',
    'witnessCancelVote',
];

class Notifier extends BasicService {
    constructor(userEventEmitter) {
        super();

        this._gate = new Gate();
        this._userEventEmitter = userEventEmitter;
        this._userMapping = new Map(); // user -> channelId -> requestId
        this._accumulator = new Map(); // user -> type -> [data]
    }

    async start() {
        const emitter = this._userEventEmitter;
        const online = this._filterOnline.bind(this);

        await this._gate.start({
            serverRoutes: {
                subscribe: this._registerSubscribe.bind(this),
                unsubscribe: this._registerUnsubscribe.bind(this),
                history: this._getHistory.bind(this),
            },
            requiredClients: {
                frontend: env.GLS_FRONTEND_GATE_CONNECT,
            },
        });

        this.addNested(this._gate);

        emitter.on('vote', online(this._handleVote));
        emitter.on('flag', online(this._handleFlag));
        emitter.on('reply', online(this._handleReply));
        emitter.on('subscribe', online(this._handleSubscribe));
        emitter.on('unsubscribe', online(this._handleUnsubscribe));
        emitter.on('repost', online(this._handleRepost));
        emitter.on('mention', online(this._handleMention));
        emitter.on('witnessVote', online(this._handleWitnessVote));
        emitter.on('witnessCancelVote', online(this._handleWitnessCancelVote));

        emitter.on('transfer', online(this._handleTransfer));

        emitter.on('blockDone', this._broadcast.bind(this));
    }

    async stop() {
        await this.stopNested();
    }

    _handleVote(user, voter, permlink) {
        this._accumulateWithIncrement(user, 'vote', { voter, permlink });
    }

    _handleFlag(user, voter, permlink) {
        this._accumulateWithIncrement(user, 'flag', { voter, permlink });
    }

    _handleReply(user, author, permlink) {
        this._accumulateWithIncrement(user, 'reply', { author, permlink });
    }

    _handleSubscribe(user, follower) {
        this._accumulateWithIncrement(user, 'subscribe', { follower });
    }

    _handleUnsubscribe(user, follower) {
        this._accumulateWithIncrement(user, 'unsubscribe', { follower });
    }

    _handleRepost(user, reposter, permlink) {
        this._accumulateWithIncrement(user, 'repost', { reposter, permlink });
    }

    _handleMention(user, permlink) {
        this._accumulateWithIncrement(user, 'mention', { permlink });
    }

    _handleWitnessVote(user, from) {
        this._accumulateWithIncrement(user, 'witnessVote', { from });
    }

    _handleWitnessCancelVote(user, from) {
        this._accumulateWithIncrement(user, 'witnessCancelVote', { from });
    }

    _handleTransfer(user, from, amount) {
        this._accumulatorBy(user, 'transfer').push({ from, amount });
    }

    _accumulateWithIncrement(user, type, data) {
        const acc = this._accumulatorBy(user, type);

        if (acc.length) {
            acc[0].counter++;
        } else {
            acc.push({ counter: 1, ...data });
        }
    }

    _filterOnline(fn) {
        return (user, ...args) => {
            if (this._userMapping.get(user)) {
                fn.call(this, user, ...args);
            }
        };
    }

    _accumulatorBy(user, type) {
        const acc = this._accumulator;

        if (!acc.get(user)) {
            acc.set(user, new Map());
        }

        if (!acc.get(user).get(type)) {
            acc.get(user).set(type, []);
        }

        return acc.get(user).get(type);
    }

    _cleanAccumulator() {
        this._accumulator = new Map();
    }

    _broadcast() {
        const users = this._userMapping;
        const acc = this._accumulator;

        for (let [user, types] of acc) {
            this._notifyUser(user, users, types);
        }

        this._cleanAccumulator();
    }

    _notifyUser(user, users, types) {
        const userData = users.get(user);
        const result = {};

        if (!userData) {
            return;
        }

        for (let [type, events] of types) {
            result[type] = events;
        }

        for (let [channelId, requestId] of userData) {
            this._gate
                .sendTo('frontend', 'transfer', { channelId, requestId, result })
                .catch(() => {
                    logger.log(`Can not send data to ${user} by ${channelId}`);
                    this._registerUnsubscribe({ user, channelId }).catch(
                        () => {} // no catch
                    );
                });
        }
    }

    async _registerSubscribe(data) {
        const map = this._userMapping;
        const { user, channelId, requestId } = data;

        if (!map.get(user)) {
            map.set(user, new Map());
        }

        map.get(user).set(channelId, requestId);

        return 'Ok';
    }

    async _registerUnsubscribe(data) {
        const map = this._userMapping;
        const { user, channelId } = data;

        map.get(user).delete(channelId);

        if (!map.get(user).size) {
            map.delete(user);
        }

        return 'Ok';
    }

    async _getHistory({ user, params: { skip = 0, limit = 10, types } }) {
        this._validateHistoryRequest(types, skip, limit);

        let query = { user, eventType: types };

        if (types === 'all') {
            delete query.eventType;
        }

        return await Event.find(
            query,
            {
                id: false,
                _id: false,
                __v: false,
                blockNum: false,
                user: false,
            },
            {
                skip,
                limit,
                lean: true,
                sort: {
                    updatedAt: -1,
                },
            }
        );
    }

    _validateHistoryRequest(types, skip, limit) {
        if (skip < 0) {
            throw { code: 400, message: 'Skip < 0' };
        }

        if (limit <= 0) {
            throw { code: 400, message: 'Limit <= 0' };
        }

        if (limit > MAX_HISTORY_LIMIT) {
            throw { code: 400, message: `Limit > ${MAX_HISTORY_LIMIT}` };
        }

        if (!types) {
            throw { code: 400, message: 'Empty types param' };
        }

        if (types !== 'all' && !Array.isArray(types)) {
            throw { code: 400, message: 'Invalid types param' };
        }

        if (types === 'all') {
            return;
        }

        for (let type of types) {
            if (!~EVENT_TYPES.indexOf(type)) {
                throw { code: 400, message: `Bad type - ${type || 'null'}` };
            }
        }
    }
}

module.exports = Notifier;
