const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reward extends Abstract {
    async handle(
        { to: user, from, quantity, receiver, memo, contractName },
        blockNum,
        transactionId
    ) {
        if (!(await this._shouldBeProcessed({ from, receiver, user }))) {
            return;
        }

        const { amount, currency } = this._parseQuantity(quantity);

        const parsedMemo = this._parseMemo(memo);
        const contentId = parsedMemo.contentId;
        const type = parsedMemo.type;
        user = parsedMemo.user;

        let post;
        let comment;
        try {
            await this.waitForTransaction(transactionId);
            const response = await this.callPrismService({ contentId }, contractName);
            comment = response.comment;
            post = response.post || response.comment.parentPost;
        } catch (error) {
            return;
        }

        const model = new Event({
            blockNum,
            user,
            post,
            comment,
            eventType: type,
            fromUsers: [from],
            actor: { id: from },
            value: {
                amount,
                currency,
            },
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }

    _parseMemo(memo) {
        let type;
        // send to and reward type
        memo = memo.split(';');
        // username
        const user = memo[0].split(': ')[1];

        // reward type and post id
        memo = memo[1].split('reward for post ');

        if (memo[0] === ' author ') {
            type = 'reward';
        } else {
            type = 'curatorReward';
        }

        memo = memo[1].split(':');
        return {
            contentId: {
                userId: memo[0],
                permlink: memo[1],
            },
            user,
            type,
        };
    }

    _parseQuantity(quantity) {
        const [amount, currency] = quantity.split(' ');

        return {
            amount,
            currency,
        };
    }

    async _shouldBeProcessed({ from, user, receiver }) {
        if (
            from.endsWith('.publish') &&
            user.endsWith('.vesting') &&
            receiver.endsWith('.vesting')
        ) {
            return !(await this._isInBlackList(from, user));
        }
        return false;
    }
}

module.exports = Reward;
