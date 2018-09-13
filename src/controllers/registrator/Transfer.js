const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Transfer extends Abstract {
    static async handle({ to: user, from, amount }, blockNum) {
        this.emit('transfer', user, { from, amount });

        const model = new Event({
            blockNum,
            user,
            eventType: 'transfer',
            fromUsers: [from],
            amount,
        });

        await model.save();
    }
}

module.exports = Transfer;
