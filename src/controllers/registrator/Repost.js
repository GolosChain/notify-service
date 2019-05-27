const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const Logger = core.utils.Logger;

class Repost extends Abstract {
    async handle({ author, permlink, rebloger, contractName }, blockNum, transactionId) {
        await this.waitForTransaction(transactionId);

        let actor, post, comment;
        const reposterName = rebloger;

        if (!author || author === reposterName) {
            return;
        }

        try {
            const response = await this.callPrismService(
                {
                    contentId: {
                        userId: author,
                        permlink,
                    },
                    userId: reposterName,
                },
                contractName
            );

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
