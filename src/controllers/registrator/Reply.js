const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reply extends Abstract {
    async handleEvent(
        {
            message_id: { author, permlink },
            parent_id: { author: user, permlink: parentPermlink },
        },
        { blockNum, app }
    ) {
        await super._handle({}, blockNum);

        if (await this._isUnnecessary({ user, author, permlink, app })) {
            return;
        }

        const metaParams = { permlink, author, user, parentPermlink, app };
        const { comment, post, actor, parentComment } = await this._getMeta(metaParams);

        const model = new Event({
            blockNum,
            user,
            eventType: 'reply',
            permlink,
            parentPermlink,
            fromUsers: [author],
            actor,
            post,
            comment,
            parentComment,
            app,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }

    async _getMeta({ permlink, author, user, parentPermlink, app }) {
        const {
            post: originalPost,
            comment: originalComment,
            user: actor,
        } = await this.getEntityMetaData(
            {
                contentId: {
                    userId: user,
                    permlink: parentPermlink,
                },
                userId: author,
            },
            app
        );

        let parentComment, post;

        if (originalComment && originalComment.parentPost) {
            post = originalComment.parentPost;
            parentComment = originalComment;
        } else {
            post = originalPost;
        }

        const { comment } = await this.getEntityMetaData(
            {
                contentId: {
                    userId: author,
                    permlink,
                },
            },
            app
        );

        return { parentComment, comment, post, actor };
    }

    async _isUnnecessary({ user, author, permlink, app }) {
        if (!user) {
            // This is a post
            return;
        }

        if (user === author) {
            // Self-reply
            return true;
        }

        if (await Event.findOne({ eventType: 'reply', permlink, 'actor.userId': author })) {
            // Reply duplicate
            return true;
        }

        if (await this._isInBlackList(author, user, app)) {
            // Ignored
            return true;
        }

        return false;
    }
}

module.exports = Reply;
