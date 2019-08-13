const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Subscribe extends Abstract {
    async handleSubscribe({ pinning: user, pinner: follower }, context) {
        await this._handle({ user, follower, eventType: 'subscribe' }, context);
    }

    async handleUnsubscribe({ pinning: user, pinner: follower }, context) {
        await this._handle({ user, follower, eventType: 'unsubscribe' }, context);
    }

    async _handle({ user, follower, eventType }, { app, blockNum }) {
        await super._handle({}, blockNum);

        if (!user || user === follower) {
            return;
        }

        if (await this._isInBlackList(follower, user, app)) {
            return;
        }

        const { user: actor } = await this.getEntityMetaData({ userId: follower }, app);
        const model = new Event({
            blockNum,
            user,
            eventType,
            fromUsers: [follower],
            actor,
            app,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Subscribe;
