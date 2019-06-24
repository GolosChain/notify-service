const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Mention extends Abstract {
    async handleEvent(
        {
            author,
            title,
            body,
            permlink,
            parent_permlink: parentPermlink,
            parent_author: parentAuthor,
            parentPost,
        },
        { blockNum, transactionId, app }
    ) {
        await this.waitForTransaction(transactionId);

        const users = this._extractMention(title, body);

        for (const username of users) {
            await this._handleSingleMention({
                username,
                author,
                parentAuthor,
                parentPermlink,
                blockNum,
                app,
            });
        }
    }

    async _handleSingleMention({
        username,
        author,
        permlink,
        parentAuthor,
        parentPermlink,
        blockNum,
        app,
    }) {
        const user = await this.resolveName(username);

        if (await this._isUnnecessary({ user, author, parentAuthor, app })) {
            return;
        }

        const { post, comment, actor } = await this._getMeta({ author, permlink, app });

        if (await this._isMentionAgain({ user, permlink, actor })) {
            return;
        }

        const model = new Event({
            blockNum,
            user,
            eventType: 'mention',
            permlink,
            parentPermlink,
            fromUsers: [actor],
            post,
            comment,
            actor,
            author,
            app,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }

    _extractMention(title, body) {
        const re = /(?<=\s|^|>)@[a-z][a-z\d.-]+(?:@[a-z][a-z\d]+)?(?=\s|$)/gi;
        const inTitle = title.match(re) || [];
        const inBody = body.match(re) || [];
        const totalRaw = inTitle.concat(inBody);
        const total = totalRaw.map(v => v.slice(1));

        return new Set(total);
    }

    async _isUnnecessary({ user, author, parentAuthor, app }) {
        if (user === author || user === parentAuthor) {
            return true;
        }

        return await this._isInBlackList(author, user, app);
    }

    async _getMeta({ author, permlink, app }) {
        let post, comment;

        const {
            comment: originalComment,
            post: originalPost,
            user: actor,
        } = await this.getEntityMetaData(
            {
                userId: author,
                contentId: {
                    userId: author,
                    permlink,
                },
            },
            app
        );

        if (originalComment && originalComment.parentPost) {
            post = originalComment.parentPost;
            comment = originalComment;
        } else {
            post = originalPost;
        }

        return { post, comment, actor };
    }

    async _isMentionAgain({ user, permlink, actor }) {
        return await Event.findOne({
            eventType: 'mention',
            permlink,
            actor,
            user,
        });
    }
}

module.exports = Mention;
