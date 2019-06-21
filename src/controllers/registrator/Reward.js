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
            const response = await this.getEntityMetaData({ contentId }, app); // TODO -

            if (!response) {
                return;
            }

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
        const regexp = new RegExp(
            /send to: (?<user>.*); *(?<type>[\S]*).*(post|comment) (?<author>.*):(?<permlink>.*)/
        );

        const groups = memo.match(regexp).groups;

        let type;
        switch (groups.type) {
            case 'author':
                type = 'reward';
                break;
            case 'curators':
                type = 'curatorReward';
                break;
            case 'benefeciary':
                type = 'benefeciaryReward';
                break;
        }

        return {
            type,
            user: groups.user,
            contentId: {
                userId: groups.author,
                permlink: groups.permlink,
            },
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
            return !(await this._isInBlackList(from, user, app)); // TODO -
        }
        return false;
    }
}

module.exports = Reward;
