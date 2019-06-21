const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reply extends Abstract {
    async handle({ author, permlink, parentPost, contractName }, blockNum, transactionId) {
        await this.waitForTransaction(transactionId);

        if (!parentPost.author || parentPost.author === author) {
            return;
        }

        if (await Event.findOne({ eventType: 'reply', permlink, fromUsers: author })) {
            return;
        }

        if (await this._isInBlackList(author, parentPost.author, app)) { // TODO -
            return;
        }

        let comment, post, actor, parentComment;

        try {
            const prismResponse = await this._populatePrismResponse({
                parentPost,
                permlink,
                author,
                contractName,
            });
            comment = prismResponse.comment;
            post = prismResponse.post;
            actor = prismResponse.actor;
            parentComment = prismResponse.parentComment;
        } catch (error) {
            return;
        }

        const type = 'reply';

        const model = new Event({
            blockNum,
            user: parentPost.author,
            eventType: type,
            permlink,
            parentPermlink: parentPost.permlink,
            fromUsers: [author],
            actor,
            post,
            comment,
            parentComment,
        });

        await model.save();

        this.emit('registerEvent', parentPost.author, model.toObject());
    }

    async _populatePrismResponse({ permlink, author, contractName, parentPost }) {
        let comment, post, actor, parentComment;
        const response = await this.callPrismService(
            {
                contentId: {
                    userId: parentPost.author,
                    permlink: parentPost.permlink,
                },
                userId: author,
            },
            contractName
        );

        actor = response.user;
        if (response.comment && response.comment.parentPost) {
            post = response.comment.parentPost;
            parentComment = response.comment;
        } else {
            post = response.post;
        }

        const contentResponse = await this.callPrismService(
            {
                contentId: {
                    userId: author,
                    permlink,
                },
            },
            contractName
        );
        comment = contentResponse.comment;

        return { comment, post, actor, parentComment };
    }
}

module.exports = Reply;
