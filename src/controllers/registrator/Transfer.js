const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Transfer extends Abstract {
    async handle(
        { to: user, from, quantity, receiver, memo },
        blockNum,
        transactionId,
        contractName
    ) {
        await this.waitForTransaction(transactionId);

        quantity = quantity.split(' ');
        const amount = quantity[0];
        const currency = quantity[1];
        if (await this._isInBlackList(from, user)) {
            return;
        }

        let type = 'transfer';
        let actor;
        let post;
        let comment;

        if (from === 'gls.publish' && user === 'gls.vesting') {
            // send to and reward type
            memo = memo.split(';');

            // username
            user = memo[0].split(': ')[1];

            // reward type and post id
            memo = memo[1].split('reward for post ');

            if (memo[0] === ' author') {
                type = 'reward';
            } else {
                type = 'curatorReward';
            }

            memo = memo[1].split(':');

            const contentId = {
                userId: memo[0],
                permlink: memo[1],
            };

            try {
                const response = await this.callPrismService(
                    {
                        contentId,
                    },
                    contractName
                );
                comment = response.comment;
                post = response.post || response.comment.parentPost;
            } catch (error) {
                return;
            }

            actor = {
                id: from,
            };
        } else {
            if (user !== receiver) {
                return;
            }
            try {
                const response = await this.callPrismService({ userId: from }, contractName);
                actor = response.user;
            } catch (error) {
                return;
            }
        }

        const model = new Event({
            blockNum,
            user,
            post,
            comment,
            eventType: type,
            fromUsers: [from],
            actor,
            value: {
                amount,
                currency,
            },
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Transfer;
