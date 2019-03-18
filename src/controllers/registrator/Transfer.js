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

        const rawAmount = new BigNum(quantity.amount);
        const digsAfterPoint = -rawAmount.sd() - quantity.decs - 1;
        const amount = rawAmount.shiftedBy(digsAfterPoint).toString();

        if (await this._isInBlackList(from, user)) {
            return;
        }

        const type = 'transfer';

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: type,
            fromUsers: [from],
            value: {
                amount: String(amount),
                currency: 'GLS',
            },
            //TODO: make real call
            ...(await this.callService('prism', `prism.${type}`, {})),
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Transfer;
