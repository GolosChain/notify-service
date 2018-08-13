const EventEmitter = require('events');
const core = require('gls-core-service');
const logger = core.Logger;

const emitter = new EventEmitter();

class Abstract {
    static async handle(data, blockNum) {
        throw 'Handler not implemented';
    }

    static _parseCustomJson(rawData) {
        const type = rawData.id;
        const user = rawData.required_posting_auths[0];
        let data;

        try {
            data = JSON.parse(rawData.json);
        } catch (error) {
            logger.log(`Bad custom JSON from - ${user}`);
            return {};
        }

        return { type, user, data };
    }

    static emit(name, ...data) {
        emitter.emit(name, ...data);
    }

    static on(name, callback) {
        emitter.on(name, callback);
    }
}

module.exports = Abstract;
