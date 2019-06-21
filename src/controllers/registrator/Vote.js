const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Vote extends Abstract {
    async handleUpVote() {
        // TODO -
    }

    async handleDownVote() {
        // TODO -
    }

    async handle(
        {
            voter,
            author: user,
            permlink,
            weight,
            parentPost,
            parent_permlink: parentPermlink,
            parent_author: parentAuthor,
            contractName,
        },
        blockNum,
        transactionId,
        type
    ) {
        if (weight === 0) {
            return;
        }

        if (voter === user) {
            return;
        }

        if (await this._isInBlackList(voter, user, app)) {
            // TODO -
            return;
        }

        await this.waitForTransaction(transactionId);

        let post, comment, actor;

        try {
            const response = await this.getEntityMetaData(
                // TODO -
                {
                    contentId: {
                        userId: user,
                        permlink,
                    },
                    userId: voter,
                },
                app
            );

            if (!response) {
                return;
            }

            post = response.post;
            comment = response.comment;

            if (comment) {
                post = comment.parentPost;
            }

            actor = response.user;
        } catch (error) {
            return;
        }

        const model = new Event({
            blockNum,
            user,
            eventType: type,
            permlink,
            fromUsers: [voter],
            post,
            comment,
            actor,
        });
        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Vote;
