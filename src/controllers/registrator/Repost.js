const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Repost extends Abstract {
    async handleEvent(
        {
            message_id: { author: user, permlink },
            rebloger: reposter,
        },
        { blockNum, transactionId, app }
    ) {
        if (await this._isUnnecessary({ user, reposter, app })) {
            return;
        }

        await this.waitForTransaction(transactionId);

        const { post, comment, actor } = await this._getMeta({ user, permlink, reposter, app });

        const model = new Event({
            blockNum,
            user,
            post,
            actor,
            comment,
            eventType: 'repost',
            permlink,
            fromUsers: [actor],
            app,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }

    async _isUnnecessary({ user, reposter, app }) {
        if (user === reposter) {
            return true;
        }

        return await this._isInBlackList(reposter, user, app);
    }

    async _getMeta({ user, permlink, reposter, app }) {
        const { user: actor, post, comment } = await this.getEntityMetaData(
            {
                contentId: {
                    userId: user,
                    permlink,
                },
                userId: reposter,
            },
            app
        );

        return { post, comment, actor };
    }
}

module.exports = Repost;
