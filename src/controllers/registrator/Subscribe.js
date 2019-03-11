const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Subscribe extends Abstract {
    async handle({ user, follower, refBlockNum }, eventType, blockNum) {
        if (!user || user === follower) {
            return;
        }

        if (await this._isInBlackList(follower, user)) {
            return;
        }

        const model = await this._saveSubscribe(
            { eventType, user, follower, refBlockNum },
            blockNum
        );

        this.emit('registerEvent', user, model.toObject());
    }

    async _saveSubscribe({ eventType, user, follower, refBlockNum }, blockNum) {
        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType,
            fromUsers: [follower],
            //TODO: make real call
            ...(await this.callService('prism', `prism.${eventType}`, {})),
        });

        await model.save();

        return model;
    }
}

module.exports = Subscribe;
