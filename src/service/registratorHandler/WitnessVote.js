const Abstract = require('./Abstract');
const Event = require('../../model/Event');

class WitnessVote extends Abstract {
    static async handle({ account: from, witness: user, approve }, blockNum) {
        let eventType;

        // not a bug
        if (approve === 'true') {
            eventType = 'witnessVote';
        } else {
            eventType = 'witnessCancelVote';
        }

        this.emit(eventType, user, { from });

        const model = new Event({
            blockNum,
            user,
            eventType,
            fromUsers: [from],
        });
        
        await model.save();
    }
}

module.exports = WitnessVote;
