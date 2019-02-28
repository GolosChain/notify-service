const EventEmitter = require('events');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const User = require('../../models/User');

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

    async _isInBlackList(nameFrom, nameTo) {
        try {
            await this._initUser(nameTo);

            const count = await User.countDocuments({ name: nameTo, blackList: nameFrom });

            return count !== 0;
        } catch (e) {
            console.error(e);
        }
    }

    async _initUser(name) {
        try {
            const a = await User.updateOne({ name }, { $set: { name } }, { upsert: true });
            return a;
        } catch (e) {
            console.error(e);
        }
    }
}

module.exports = Abstract;
