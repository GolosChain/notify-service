const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class WitnessVote extends Abstract {
    static async handle({ account: from, witness: user, approve }, blockNum) {
        let eventType;

        if (approve) {
            eventType = 'witnessVote';
        } else {
            eventType = 'witnessCancelVote';
        }

        const model = new Event({
            blockNum,
            user,
            eventType,
            fromUsers: [from],
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = WitnessVote;
