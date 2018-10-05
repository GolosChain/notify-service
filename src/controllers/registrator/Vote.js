const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Vote extends Abstract {
    static async handle({ voter, author: user, permlink, weight }, blockNum) {
        if (weight === 0) {
            return;
        }

        if (voter === user) {
            return;
        }

        let type;

        if (weight > 0) {
            type = 'vote';
        } else {
            type = 'flag';
        }

        const model = new Event({
            blockNum,
            user,
            eventType: type,
            permlink: permlink,
            fromUsers: [voter],
        });
        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Vote;
