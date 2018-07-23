const core = require('griboyedov');
const BasicService = core.service.Basic;
const Gate = core.service.Gate;
const logger = core.Logger;
const serviceAliasEnv = core.ServiceAliasEnv;
const stats = core.Stats.client;
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

    async _broadcast() {
        try {
            const users = this._userMapping;
            const acc = this._accumulator;
            const options = await this._extractNotifyOptions();

            for (let [user, types] of acc) {
                this._notifyByGate({ user, users, types, options });
                this._notifyByPush({ user, types, options });
            }

            this._cleanAccumulator();
        } catch (error) {
            stats.increment('Broadcast error');
            logger.error(`Broadcast error - ${error}`);
            process.exit(1);
        }
    }

    _notifyByGate({ user, users, types, options }) {
        const onlineUserData = users.get(user);

        if (!onlineUserData) {
            return;
        }

        const result = this._filtrateOnlineNotifyByOptions(user, types, options);

        if (Object.keys(result).length === 0) {
            return;
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

    _filtrateOnlineNotifyByOptions(user, types, options) {
        const result = {};

        for (let [type, events] of types) {
            let notifyOn = true;

            try {
                notifyOn = options[user].notify[type];
            } catch (error) {
                // options not set, ok
            }

            if (notifyOn) {
                result[type] = events;
            }
        }

        return result;
    }

    _notifyByPush({ user, types, options }) {
        const result = this._filtratePushNotifyByOptions({ user, types, options });

        if (result.byUser) {
            this._sendPush(user, { user, data: result });
        } else {
            for (let key of Object.keys(result.byKey)) {
                this._sendPush(user, { key, data: result.byKey[key] });
            }
        }
    }

    _filtratePushNotifyByOptions(user, types, options) {
        const result = { byKey: {}, byUser: {} };

        // not hell, just tree
        for (let [type, events] of types) {
            try {
                let userOptions = options[user].push;

                for (let device of Object.keys(userOptions)) {
                    for (let key of Object.keys(userOptions[device])) {
                        if (userOptions[device][key][type]) {
                            result.byKey[key] = result.byKey[key] || {};
                            result.byKey[key][type] = events;
                        }
                    }
                }
            } catch (error) {
                // options not set, send to all
                result.byUser[type] = events;
            }
        }

        return result;
    }

    async _extractNotifyOptions(usersMap) {
        const request = [];
        const result = {};
        const users = usersMap.keys();

        for (let user of users) {
            request.push({ user, service: 'tolstoy', path: 'notify' });
        }

        const response = await this._gate.sendTo('solzhenitsyn', 'get', request);

        for (let i = 0; i < response.length; i++) {
            result[users[i]] = response[i];
        }

        return result;
    }

    _sendPush(user, data) {
        this._gate.sendTo('pushkin', 'transfer', data).catch(() => {
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
