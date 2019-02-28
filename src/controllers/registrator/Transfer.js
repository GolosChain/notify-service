const Abstract = require('./Abstract');
const Event = require('../../models/Event');
const core = require('gls-core-service');
const BigNum = core.types.BigNum;

const TRANFER_ACTIN_RECEIVER = 'cyber.token';

class Transfer extends Abstract {
    async handle({ to: user, from, quantity, receiver, refBlockNum }, blockNum) {
        if (receiver !== TRANFER_ACTIN_RECEIVER) {
            return;
        }

        const rawAmount = new BigNum(quantity.amount);
        const amount = rawAmount.shiftedBy(-rawAmount.sd() - quantity.decs - 1).toString();

        if (await this._isInBlackList(from, user)) {
            return;
        }

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: 'transfer',
            fromUsers: [from],
            amount,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Transfer;
