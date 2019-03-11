const EventEmitter = require('events');
const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const User = require('../../models/User');
const connector = require('../../services/Connector');

class Abstract extends BasicController {
    constructor() {
        super({ connector });
        this._emitter = new EventEmitter();
    }

    async handle(data, blockNum) {
        throw 'Handler not implemented';
    }

    async callService(...rest) {
        // TODO: remove this method override

        return {
            actor: {
                id: 's',
                name: 'kek',
                avatarUrl: 'https://ava.jpg',
            },
            post: {
                contentId: {
                    userId: 'post-author',
                    refBlockNum: 123,
                    permlink: 'post-permlink',
                },
                title: 'Cool title',
            },
            comment: {
                contentId: {
                    userId: 'comment-author',
                    refBlockNum: 124,
                    permlink: 'comment-permlink',
                },
                body: 'Hi, how are you?',
            },
            community: {
                id: 'gls',
                name: 'Golos',
            },
            parentComment: {
                contentId: {
                    userId: 'original-comment-author',
                    refBlockNum: 124,
                    permlink: 'comment-permlink',
                },
                body: 'Hi, how are you?',
            },
            payout: {
                amount: 0.011,
                currency: 'GLS',
            },
        };
    }

    _parseCustomJson(rawData) {
        // TODO: add refBlockNum fetching
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
        await this._initUser(nameTo);

        const count = await User.countDocuments({ name: nameTo, blackList: nameFrom });
        return count !== 0;
    }

    async _initUser(name) {
        return await User.updateOne({ name }, { $set: { name } }, { upsert: true });
    }
}

module.exports = Abstract;
