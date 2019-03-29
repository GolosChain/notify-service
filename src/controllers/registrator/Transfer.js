const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const BigNum = core.types.BigNum;

const TRANSFER_ACTION_RECEIVER = 'cyber.token';

class Transfer extends Abstract {
    async handle({ to: user, from, quantity, receiver, refBlockNum }, blockNum) {
        if (receiver !== TRANSFER_ACTION_RECEIVER) {
            return;
        }

        const amount = this._calculateAmount(quantity);

        if (await this._isInBlackList(from, user)) {
            return;
        }

        const type = 'transfer';
        let actor;

        try {
            const response = await this.callPrismService({ userId: from });
            actor = response.user;
        } catch (error) {
            return;
        }

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: type,
            fromUsers: [from],
            actor,
            value: {
                amount,
                // TODO: wait for multiple currencies support
                currency: 'GLS',
            },
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }

    _calculateAmount(quantity) {
        return new BigNum(quantity.amount).shiftedBy(-quantity.decs).toString();
    }
}

module.exports = Transfer;
