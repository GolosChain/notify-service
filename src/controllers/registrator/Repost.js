const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const Logger = core.utils.Logger;

class Repost extends Abstract {
    async handle(rawData, blockNum) {
        const { user, reposter, permlink, refBlockNum } = this._tryExtractRepost(rawData);
        if (!user || user === reposter) {
            return;
        }

        if (await this._isInBlackList(reposter, user)) {
            return;
        }

        const model = await this._saveRepost({ user, reposter, permlink, refBlockNum }, blockNum);

        this.emit('registerEvent', user, model.toObject());
    }

    _tryExtractRepost(rawData) {
        const { type, user: reposter, data, refBlockNum } = this._parseCustomJson(rawData);

        if (type !== 'follow') {
            return {};
        }

        try {
            if (data[0] !== 'reblog') {
                return {};
            }

            const { author: user, permlink } = data[1];

            return { user, reposter, permlink };
        } catch (error) {
            Logger.log(`Bad repost from - ${reposter}`);
            return {};
        }
    }

    async _saveRepost({ user, reposter, permlink, refBlockNum }, blockNum) {
        const type = 'respost';
        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: type,
            permlink,
            fromUsers: [reposter],
            //TODO: make real call
            // ...(await this.callPrismService('prism', `prism.${type}`, {})),
        });

        await model.save();

        return model;
    }
}

module.exports = Repost;
