const core = require('griboyedov');
const BasicService = core.service.Basic;
const Gate = core.service.Gate;
const logger = core.Logger;
const serviceAliasEnv = core.ServiceAliasEnv;
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
        await this._gate.start({
            serverRoutes: {
                subscribe: this._registerSubscribe.bind(this),
                unsubscribe: this._registerUnsubscribe.bind(this),
                history: this._getHistory.bind(this),
            },
            requiredClients: serviceAliasEnv,
        });

        this.addNested(this._gate);

        this._generateListeners();
    }

    async stop() {
        await this.stopNested();
    }

    _generateListeners() {
        const emitter = this._userEventEmitter;
        let fn;

        for (let eventType of EVENT_TYPES) {
            switch (eventType) {
                case 'transfer':
                    fn = (user, data) => this._accumulate(user, eventType, data);
                    break;
                default:
                    fn = (user, data) => this._accumulateWithIncrement(user, eventType, data);
                    break;
            }

            emitter.on(eventType, fn);
        }

        emitter.on('blockDone', this._broadcast.bind(this));
    }

    _accumulate(user, type, data) {
        this._accumulatorBy(user, type).push(data);
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
            this._notifyByGate(user, users, types);
            this._notifyByPush(user, types);
        }

        this._cleanAccumulator();
    }

    _notifyByGate(user, users, types) {
        const onlineUserData = users.get(user);
        const result = {};

        if (!onlineUserData) {
            return;
        }

        for (let [type, events] of types) {
            result[type] = events;
        }

        for (let [channelId, requestId] of onlineUserData) {
            this._gate
                .sendTo('bulgakov', 'transfer', { channelId, requestId, result })
                .catch(() => {
                    logger.log(`Can not send data to ${user} by ${channelId}`);
                    this._registerUnsubscribe({ user, channelId }).catch(
                        () => {} // no catch
                    );
                });
        }
    }

    _notifyByPush(user, types) {
        const result = {};

        for (let [type, events] of types) {
            result[type] = events;
        }

        this._gate.sendTo('pushkin', 'transfer', result).catch(() => {
            logger.log(`Can not send data to ${user} by push`);
        });
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

    async _getHistory({ user, params: { skip = 0, limit = 10, type: eventType } }) {
        if (skip < 0) {
            throw { code: 400, message: 'Skip < 0' };
        }

        if (limit <= 0) {
            throw { code: 400, message: 'Limit <= 0' };
        }

        if (limit > MAX_HISTORY_LIMIT) {
            throw { code: 400, message: `Limit > ${MAX_HISTORY_LIMIT}` };
        }

        if (!~EVENT_TYPES.indexOf(eventType)) {
            throw { code: 400, message: `Bad type - ${eventType || 'null'}` };
        }

        return await Event.find(
            { user, eventType },
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
}

module.exports = Notifier;
