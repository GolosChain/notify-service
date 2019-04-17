const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Vote extends Abstract {
    async handle(
        { voter, author: user, permlink, weight, refBlockNum, ...rest },
        blockNum,
        transactionId,
        type
    ) {
        if (weight === 0) {
            return;
        }

        if (voter === user) {
            return;
        }

        if (await this._isInBlackList(voter, user)) {
            return;
        }

        await this.waitForTransaction(transactionId);

        let post, comment, actor;

        try {
            const response = await this.callPrismService({
                contentId: {
                    userId: user,
                    refBlockNum,
                    permlink,
                },
                userId: voter,
            });

            post = response.post;
            comment = response.comment;
            actor = response.user;
        } catch (error) {
            return;
        }

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: type,
            permlink,
            fromUsers: [voter],
            post,
            comment,
            actor,
        });
        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Vote;
