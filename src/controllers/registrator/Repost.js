const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const Logger = core.utils.Logger;

class Repost extends Abstract {
    static async handle(rawData, blockNum) {
        const { user, reposter, permlink } = this._tryExtractRepost(rawData);

        if (!user) {
            return;
        }

        this.emit('repost', user, { reposter, permlink });

        await this._saveRepost({ user, reposter, permlink }, blockNum);
    }

    static _tryExtractRepost(rawData) {
        const { type, user: reposter, data } = this._parseCustomJson(rawData);

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

    static async _saveRepost({ user, reposter, permlink }, blockNum) {
        const model = new Event({
            blockNum,
            user,
            eventType: 'repost',
            permlink,
            fromUsers: [reposter],
        });

        await model.save();
    }
}

module.exports = Repost;
