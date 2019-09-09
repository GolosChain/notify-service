const core = require('gls-core-service');
const Logger = core.utils.Logger;
const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reward extends Abstract {
    async handleEvent(
        { to: target, from, quantity, memo },
        { blockNum, blockTime, app, receiver }
    ) {
        await super._handle({}, blockNum);

        if (await this._isUnnecessary({ from, receiver, target, app })) {
            return;
        }

        const { amount, currency } = this._parseQuantity(quantity);
        const { contentId, user, type } = this._parseMemo(memo);
        if (!type) {
            return;
        }
        const { comment, post } = await this._getMeta(contentId, app);

        const model = new Event({
            blockNum,
            blockTime,
            user,
            post,
            comment,
            eventType: type,
            fromUsers: [from],
            value: {
                amount,
                currency,
            },
            app,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }

    _parseMemo(memo) {
        const pattern = /((send to: )(?<userId>.*);|.*?) *(?<rawType>[\S]*).*(post|comment) (?<author>.*):(?<permlink>.*)/;
        const { author, rawType, userId, permlink } = memo.match(pattern).groups;
        let type;

        switch (rawType) {
            case 'author':
                type = 'reward';
                break;

            case 'curators':
                type = 'curatorReward';
                break;

            case 'benefeciary':
                type = 'benefeciaryReward';
                break;
            default:
                Logger.info(`Unknown reward type: ${rawType}, skipping`);
                break;
        }

        return {
            type,
            author,
            contentId: { userId: author, permlink },
            user: userId,
        };
    }

    _parseQuantity(quantity) {
        const [amount, currency] = quantity.split(' ');

        return { amount, currency };
    }

    async _isUnnecessary({ from, target, receiver, app }) {
        const isPublishContract = from.endsWith('.publish');
        const isVestingIsReceiver = receiver.endsWith('.token');
        const isVestingIsTarget = target.endsWith('.vesting');

        if (!(isPublishContract && isVestingIsReceiver && isVestingIsTarget)) {
            return true;
        }

        return await this._isInBlackList(from, target, app);
    }

    async _getMeta(contentId, app) {
        const meta = await this.getEntityMetaData({ contentId }, app);

        return {
            comment: meta.comment,
            post: meta.post || meta.comment.parentPost,
        };
    }
}

module.exports = Reward;
