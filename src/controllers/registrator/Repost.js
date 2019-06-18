const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const Logger = core.utils.Logger;

class Repost extends Abstract {
    async handle(
        { author, permlink, rebloger: reposterName, contractName },
        blockNum,
        transactionId
    ) {
        await this.waitForTransaction(transactionId);

        let actor, post, comment;

        if (!author || author === reposterName) {
            return;
        }

        try {
            const prismResponse = await this._populatePrismResponse({
                permlink,
                contractName,
                author,
                reposterName,
            });

            actor = prismResponse.actor;
            post = prismResponse.post;
            comment = prismResponse.comment;
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

    async _populatePrismResponse({ permlink, author, reposterName, contractName }) {
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

        return {
            actor: response.user,
            post: response.post,
            comment: response.comment,
        };
    }
}

module.exports = Repost;
