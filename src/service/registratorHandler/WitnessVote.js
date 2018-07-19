const core = require('griboyedov');
const Moments = core.Moments;
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

        let model = await Event.findOne({
            eventType,
            user,
            createdAt: { $gt: Moments.currentDayStart },
        });

        if (model) {
            await this._incrementModel(model, from);
        } else {
            model = new Event({
                blockNum,
                user,
                eventType,
                fromUsers: [from],
            });
            await model.save();
        }
    }
}

module.exports = WitnessVote;
