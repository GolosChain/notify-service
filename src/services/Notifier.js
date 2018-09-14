const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const stats = core.statsClient;
const eventTypes = require('../data/eventTypes');

class Notifier extends BasicService {
    constructor(registrator, connector) {
        super();

        this._connector = connector;
        this._registrator = registrator;
        this._accumulator = new Map(); // user -> type -> [data]
    }

    async start() {
        this._generateListeners();
    }

    async stop() {
        await this.stopNested();
    }

    _generateListeners() {
        let fn;

        for (let eventType of eventTypes) {
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
            await this._connector.sendTo('onlineNotify', 'transfer', result);
        } catch (error) {
            stats.increment('broadcast_to_online_notifier_error');
            Logger.error(`On send to online notifier - ${error}`);
        }

        try {
            await this._connector.sendTo('push', 'transfer', result);
        } catch (error) {
            stats.increment('broadcast_to_push_error');
            Logger.error(`On send to push - ${error}`);
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
}

module.exports = Notifier;
