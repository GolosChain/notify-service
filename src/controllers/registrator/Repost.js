const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const Logger = core.utils.Logger;

class Repost extends Abstract {
    async handle({ refBlockNum, author, permlink, rebloger }, blockNum, transactionId) {
        await this.waitForTransaction(transactionId);

        let actor, post, comment;
        const reposterName = rebloger;

        if (!author || author === reposterName) {
            return;
        }

        try {
            const response = await this.callPrismService({
                contentId: {
                    userId: author,
                    refBlockNum,
                    permlink,
                },
                userId: reposterName,
            });

            actor = response.user;
            post = response.post;
            comment = response.comment;
        } catch (error) {
            return;
        }

        if (await this._isInBlackList(actor, author)) {
            return;
        }

        const type = 'repost';

        const model = new Event({
            blockNum,
            refBlockNum,
            user: author,
            post,
            actor,
            comment,
            eventType: type,
            permlink,
            fromUsers: [actor],
        });

        await model.save();

        this.emit('registerEvent', author, model.toObject());
    }
}

module.exports = Repost;
