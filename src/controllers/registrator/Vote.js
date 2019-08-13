const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Vote extends Abstract {
    async handleUpVote(params, context) {
        await this._handle(params, context, 'upvote');
    }

    async handleDownVote(params, context) {
        await this._handle(params, context, 'downvote');
    }

    async _handle(
        {
            voter,
            weight,
            message_id: { author: userId, permlink },
        },
        { app, blockNum },
        eventType
    ) {
        await super._handle({}, blockNum);

        if (await this._isUnnecessary({ weight, voter, userId, app })) {
            return;
        }

        const { post, comment, actor } = await this._getMeta({ userId, permlink, voter, app });
        const model = new Event({
            blockNum,
            user: userId,
            eventType,
            permlink,
            fromUsers: [voter],
            post,
            comment,
            actor,
            app,
        });
        await model.save();

        this.emit('registerEvent', userId, model.toObject());
    }

    async _isUnnecessary({ weight, voter, userId, app }) {
        if (weight === 0) {
            return true;
        }

        if (voter === userId) {
            return true;
        }

        if (await this._isInBlackList(voter, userId, app)) {
            return true;
        }
    }

    async _getMeta({ userId, permlink, voter, app }) {
        const meta = await this.getEntityMetaData(
            {
                contentId: {
                    userId,
                    permlink,
                },
                userId: voter,
            },
            app
        );

        let post;
        const comment = meta.comment;
        const actor = meta.user;

        if (comment) {
            post = comment.parentPost;
        } else {
            post = meta.post;
        }

        return { post, comment, actor };
    }
}

module.exports = Vote;
