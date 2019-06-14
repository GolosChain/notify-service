const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Transfer extends Abstract {
    async handle(
        { to: user, from, quantity, receiver, memo, contractName },
        blockNum,
        transactionId
    ) {
        if (from === `${contractName}.publish` && user === `${contractName}.vesting`) {
            return;
        }

        if (user !== receiver) {
            return;
        }

        await this.waitForTransaction(transactionId);

        const { amount, currency } = this._parseQuantity(quantity);
        if (await this._isInBlackList(from, user)) {
            return;
        }

        let type = 'transfer';
        let actor;

        try {
            const response = await this.callPrismService({ userId: from }, contractName);
            actor = response.user;
        } catch (error) {
            return;
        }

        const model = new Event({
            blockNum,
            user,
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
    _parseQuantity(quantity) {
        const [amount, currency] = quantity.split(' ');

        return {
            amount,
            currency,
        };
    }
}

module.exports = Transfer;
