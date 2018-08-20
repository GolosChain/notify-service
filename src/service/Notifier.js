const core = require('gls-core-service');
const BasicService = core.service.Basic;
const Gate = core.service.Gate;
const logger = core.Logger;
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
    constructor(registrator) {
        super();

        this._gate = new Gate();
        this._registrator = registrator;
        this._accumulator = new Map(); // user -> type -> [data]
    }

    async start() {
        await this._gate.start({
            serverRoutes: {
                history: this._getHistory.bind(this),
            },
            requiredClients: {
                onlineNotify: env.GLS_ONLINE_NOTIFY_CONNECT,
                push: env.GLS_PUSH_CONNECT,
            },
        });

        this.addNested(this._gate);

        this._generateListeners();
    }

    async stop() {
        await this.stopNested();
    }

    _generateListeners() {
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

            this._registrator.on(eventType, fn);
        }

        this._registrator.on('blockDone', this._broadcast.bind(this));
    }

    _accumulate(user, type, data) {
        this._accumulatorBy(user, type).add(data);
    }

    _accumulateWithIncrement(user, type, data) {
        const acc = this._accumulatorBy(user, type);

        if (acc.size) {
            acc.values().next().value.counter++;
        } else {
            acc.add({ counter: 1, ...data });
        }
    }

    _accumulatorBy(user, type) {
        const acc = this._accumulator;

        if (!acc.get(user)) {
            acc.set(user, new Map());
        }

        if (!acc.get(user).get(type)) {
            acc.get(user).set(type, new Set());
        }

        return acc.get(user).get(type);
    }

    _cleanAccumulator() {
        this._accumulator = new Map();
    }

    async _broadcast() {
        const time = new Date();
        const result = this._prepareBroadcastData();

        try {
            await this._gate.sendTo('onlineNotify', 'transfer', result);
        } catch (error) {
            stats.increment('broadcast_to_online_notifier_error');
            logger.error(`On send to online notifier - ${error}`);
        }

        try {
            await this._gate.sendTo('push', 'transfer', result);
        } catch (error) {
            stats.increment('broadcast_to_push_error');
            logger.error(`On send to push - ${error}`);
        }

        stats.timing('broadcast_notify', new Date() - time);
    }

    _prepareBroadcastData() {
        const acc = this._accumulator;
        const result = {};

        this._cleanAccumulator();

        for (let [user, events] of acc) {
            result[user] = result[user] || {};

            for (let [event, data] of events) {
                result[user][event] = Array.from(data.values());
            }
        }

        return result;
    }

    async _getHistory({ user, fromId = null, limit = 10, types = 'all' }) {
        this._validateHistoryRequest(limit, types);

        const allQuery = { user };
        const freshQuery = { user, fresh: true };
        let historyQuery = { user, eventType: types };

        if (types === 'all') {
            historyQuery = allQuery;
        }

        const total = await Event.find(allQuery).countDocuments();
        const fresh = await Event.find(freshQuery).countDocuments();

        if (fromId) {
            historyQuery._id = { $gt: fromId };
        }

        const data = await Event.find(
            historyQuery,
            {
                __v: false,
                blockNum: false,
                user: false,
            },
            {
                limit,
                lean: true,
            }
        );

        for (let event of data) {
            await this._freshOff(event._id);
        }

        return {
            total,
            fresh,
            data,
        };
    }

    _validateHistoryRequest(limit, types) {
        if (limit <= 0) {
            throw { code: 400, message: 'Limit <= 0' };
        }

        if (limit > MAX_HISTORY_LIMIT) {
            throw { code: 400, message: `Limit > ${MAX_HISTORY_LIMIT}` };
        }

        if (!Array.isArray(types) && types !== 'all') {
            throw { code: 400, message: 'Bad types' };
        }

        if (types !== 'all') {
            for (let type of types) {
                if (!EVENT_TYPES.includes(type)) {
                    throw { code: 400, message: `Bad type - ${type || 'null'}` };
                }
            }
        }
    }

    async _freshOff(_id) {
        await Event.update({ _id }, { $set: { fresh: false } });
    }
}

module.exports = Notifier;
