const core = require('griboyedov');
const Moments = core.Moments;
const Abstract = require('./Abstract');
const Event = require('../../model/Event');

class Vote extends Abstract {
    static async handle({ voter, author: user, permlink, weight }, blockNum) {
        if (weight === 0) {
            return;
        }

        let type;

        if (weight > 0) {
            type = 'vote';
        } else {
            type = 'flag';
        }

        this.emit(type, user, { voter, permlink });

        let model = await Event.findOne({
            eventType: type,
            user,
            permlink,
            createdAt: { $gt: Moments.currentDayStart },
        });

        if (model) {
            await this._incrementModel(model, voter);
        } else {
            model = new Event({
                blockNum,
                user,
                eventType: type,
                permlink: permlink,
                fromUsers: [voter],
            });
            await model.save();
        }
    }
}

module.exports = Vote;
