const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Vote extends Abstract {
    async handle({ voter, author: user, permlink, weight, refBlockNum }, blockNum) {
        if (weight === 0) {
            return;
        }

        if (voter === user) {
            return;
        }

        if (await this._isInBlackList(voter, user)) {
            return;
        }

        const type = weight > 0 ? 'upvote' : 'downvote';

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: type,
            permlink,
            fromUsers: [voter],
            //TODO: make real call
            ...(await this.callService('prism', `prism.${type}`, {})),
        });
        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Vote;
