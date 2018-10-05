const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Transfer extends Abstract {
    static async handle({ to: user, from, amount }, blockNum) {
        const model = new Event({
            blockNum,
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
