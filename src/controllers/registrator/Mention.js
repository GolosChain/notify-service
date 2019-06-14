const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Mention extends Abstract {
    async handle(
        {
            author,
            title,
            body,
            permlink,
            parent_permlink: parentPermlink,
            parent_author: parentAuthor,
            parentPost,
            contractName,
        },
        blockNum,
        transactionId
    ) {
        await this.waitForTransaction(transactionId);
        const users = this._extractMention(title, body);

        for (let user of users) {
            user = await this.resolveName(user);

            if (user === author || user === parentAuthor) {
                continue;
            }

            if (await this._isInBlackList(author, user)) {
                continue;
            }

            let comment, actor, post;

            try {
                const response = await this._populatePrismResponse({
                    author,
                    permlink,
                    contractName,
                });

                comment = response.comment;
                actor = response.actor;
                post = response.post;
            } catch (error) {
                return;
            }

            if (
                await Event.findOne({
                    eventType: 'mention',
                    permlink,
                    actor,
                    user,
                })
            ) {
                return;
            }

            const type = 'mention';

            const model = new Event({
                blockNum,
                user,
                eventType: type,
                permlink,
                parentPermlink,
                fromUsers: [actor],
                post,
                comment,
                actor,
                author,
            });

            await model.save();

            this.emit('registerEvent', user, model.toObject());
        }
    }

    _extractMention(title, body) {
        const re = /(?<=\s|^|>)@[a-z][a-z\d.-]+(?:@[a-z][a-z\d]+)?(?=\s|$)/gi;
        const inTitle = title.match(re) || [];
        const inBody = body.match(re) || [];
        const totalRaw = inTitle.concat(inBody);
        const total = totalRaw.map(v => v.slice(1));

        return new Set(total);
    }

    async _populatePrismResponse({ author, permlink, contractName }) {
        let post, comment, actor;
        const response = await this.callPrismService(
            {
                userId: author,
                contentId: {
                    userId: author,
                    permlink,
                },
            },
            contractName
        );
        if (response.comment && response.comment.parentPost) {
            post = response.comment.parentPost;
            comment = response.comment;
        } else {
            post = response.post;
        }
        actor = response.user;

        return { post, comment, actor };
    }
}

module.exports = Mention;
