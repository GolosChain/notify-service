const fetch = require('node-fetch');
const { JsonRpc } = require('cyberwayjs');
const EventEmitter = require('events');
const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const User = require('../../models/User');
const env = require('../../data/env');
const RPC = new JsonRpc(env.GLS_CYBERWAY_HTTP_URL, { fetch });

class Abstract extends BasicController {
    constructor({ connector }) {
        super({ connector });
        this._emitter = new EventEmitter();
    }

    async handle(data, blockNum) {
        throw 'Handler not implemented';
    }

    async resolveName(user) {
        let name = user;
        if (!user.includes('@')) {
            name += '@golos';
        }
        try {
            const resolved = await RPC.fetch('/v1/chain/resolve_names', [user]);
            return resolved[0].resolved_username;
        } catch (error) {
            Logger.warn(`Cannot get such an account -- ${name}`);
        }
        return user;
    }

    _populatePrismRequestData(data, { userId, communityId, postId, commentId, contentId }) {
        if (postId) {
            // нужно делать именно так, чтобы гарантировать порядок полей
            data.postId = {
                userId: postId.userId,
                permlink: postId.permlink,
            };
        }

        if (commentId) {
            // нужно делать именно так, чтобы гарантировать порядок полей
            data.commentId = {
                userId: commentId.userId,
                permlink: commentId.permlink,
            };
        }

        if (contentId) {
            // нужно делать именно так, чтобы гарантировать порядок полей
            data.contentId = {
                userId: contentId.userId,
                permlink: contentId.permlink,
            };
        }

        if (userId) {
            data.userId = userId;
        }

        if (communityId) {
            data.communityId = communityId;
        }
    }

    async callPrismService(
        { userId, communityId, postId, commentId, contentId },
        contractName = 'cyber'
    ) {
        const data = { app: contractName };
        this._populatePrismRequestData(data, { userId, communityId, postId, commentId, contentId });

        try {
            return await this.callService('prism', 'getNotifyMeta', data);
        } catch (error) {
            Logger.error(
                `Error calling prism.getNotifyMeta in ${
                    this.constructor.name
                } with data:\n${JSON.stringify(data, null, 2)}\n`,
                error
            );

            throw error;
        }
    }

    async waitForTransaction(transactionId, maxRetries = 5, retryNum = 0) {
        try {
            return await this.callService('prism', 'waitForTransaction', {
                transactionId,
            });
        } catch (error) {
            if (
                (error.code === 408 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') &&
                retryNum <= maxRetries
            ) {
                return await this.waitForTransaction(transactionId, maxRetries, retryNum++);
            }
            Logger.error(`Error calling prism.waitForTransaction`, error);

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
