const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Transfer extends Abstract {
    async handleEvent(
        { to: user, from, quantity, receiver, memo },
        { blockNum, transactionId, app }
    ) {
        if (from === `${app}.publish` && user === `${app}.vesting`) {
            return;
        }

        if (user !== receiver) {
            return;
        }

        await this.waitForTransaction(transactionId);

        const { amount, currency } = this._parseQuantity(quantity);

        if (await this._isInBlackList(from, user, app)) {
            return;
        }

        const { user: actor } = await this.getEntityMetaData({ userId: from }, app);
        const model = new Event({
            blockNum,
            user,
            eventType: 'transfer',
            fromUsers: [from],
            actor,
            value: { amount, currency },
            app,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }

    _parseQuantity(quantity) {
        const [amount, currency] = quantity.split(' ');

        return { amount, currency };
    }
}

module.exports = Transfer;
