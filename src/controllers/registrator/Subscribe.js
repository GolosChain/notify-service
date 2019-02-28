const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Subscribe extends Abstract {
    async handle({ user, follower }, eventType, blockNum) {
        if (!user || user === follower) {
            return;
        }

        if (await this._isInBlackList(follower, user)) {
            return;
        }

        const model = await this._saveSubscribe({ eventType, user, follower }, blockNum);

        this.emit('registerEvent', user, model.toObject());
    }

    async _saveSubscribe({ eventType, user, follower }, blockNum) {
        const model = new Event({
            blockNum,
            user,
            eventType,
            fromUsers: [follower],
        });

        await model.save();

        return model;
    }
}

module.exports = Subscribe;
