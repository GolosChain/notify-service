const EventEmitter = require('events');
const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const User = require('../../models/User');

class Abstract extends BasicController {
    constructor({ connector }) {
        super({ connector });
        this._emitter = new EventEmitter();
    }

    async handle(data, blockNum) {
        throw 'Handler not implemented';
    }

    async callPrismService({ userId, communityId, postId, commentId, contentId }) {
        const data = {};

        if (postId) {
            // нужно делать именно так, чтобы гарантировать порядок полей
            data.postId = {
                userId: postId.userId,
                permlink: postId.permlink,
                refBlockNum: postId.refBlockNum,
            };
        }

        if (commentId) {
            // нужно делать именно так, чтобы гарантировать порядок полей
            data.commentId = {
                userId: commentId.userId,
                permlink: commentId.permlink,
                refBlockNum: commentId.refBlockNum,
            };
        }

        if (contentId) {
            // нужно делать именно так, чтобы гарантировать порядок полей
            data.contentId = {
                userId: contentId.userId,
                permlink: contentId.permlink,
                refBlockNum: contentId.refBlockNum,
            };
        }

        if (userId) {
            data.userId = userId;
        }

        if (communityId) {
            data.communityId = communityId;
        }

        try {
            return await this.callService('prism', 'getNotifyMeta', data);
        } catch (error) {
            Logger.error(
                `Error calling prism.getNotifyMeta in ${
                    this.constructor.name
                } with data:\n${JSON.stringify(data, null, 2)}\n`,
                JSON.stringify(error, null, 2)
            );

            throw error;
        }
    }

    async waitForTransaction(transactionId) {
        try {
            return await this.callService('prism', 'waitForTransaction', {
                transactionId,
            });
        } catch (error) {
            Logger.error(`Error calling prism.waitForTransaction`, JSON.stringify(error, null, 2));

            throw error;
        }
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
