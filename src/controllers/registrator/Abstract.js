const EventEmitter = require('events');
const core = require('gls-core-service');
const Logger = core.utils.Logger;

class Abstract {
    constructor() {
        this._emitter = new EventEmitter();
    }

    async handle(data, blockNum) {
        throw 'Handler not implemented';
    }

    _parseCustomJson(rawData) {
        const type = rawData.id;
        const user = rawData.required_posting_auths[0];
        let data;

        try {
            data = JSON.parse(rawData.json);
        } catch (error) {
            Logger.log(`Bad custom JSON from - ${user}`);
            return {};
        }

        return { type, user, data };
    }

    emit(name, ...data) {
        this._emitter.emit(name, ...data);
    }

    on(name, callback) {
        this._emitter.on(name, callback);
    }
}

module.exports = Abstract;
