const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const metrics = core.utils.metrics;

class Notifier extends BasicService {
    constructor(registrator, connector) {
        super();

        this._connector = connector;
        this._registrator = registrator;
        this._accumulator = {};
    }

    async start() {
        this._registrator.on('registerEvent', this._accumulateEvent.bind(this));
        this._registrator.on('blockDone', this._broadcast.bind(this));
    }

    async stop() {
        await this.stopNested();
    }

    async _accumulateEvent(user, data) {
        data = Object.assign({}, data);

        delete data.__v;
        delete data.user;

        this._accumulator[user] = this._accumulator[user] || [];
        this._accumulator[user].push(data);
    }

    async _broadcast() {
        if (Object.entries(this._accumulator).length > 0) {
            const end = metrics.startTimer('broadcast_notify');
            const accumulator = this._accumulator;

            this._accumulator = {};

            await this._sendToOnlineNotify(accumulator);
            await this._sendToPush(accumulator);

            end();
        }
    }

    async _sendToOnlineNotify(accumulator) {
        try {
            await this._connector.sendTo('onlineNotify', 'transfer', accumulator);
        } catch (error) {
            metrics.increment('broadcast_to_online_notifier_error');
            Logger.error(`On send to online notifier - ${error}`);
        }
    }

    async _sendToPush(accumulator) {
        try {
            await this._connector.sendTo('push', 'transfer', accumulator);
        } catch (error) {
            metrics.inc('broadcast_to_push_error');
            Logger.error(`On send to push - ${error}`);
        }
    }
}

module.exports = Notifier;
