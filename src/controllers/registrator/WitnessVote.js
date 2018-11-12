const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class WitnessVote extends Abstract {
    async handle({ account: from, witness: user, approve }, blockNum) {
        if (await this._isInBlackList(from, user)) {
            return;
        }

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
