const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reply extends Abstract {
    async handle({ refBlockNum, author, permlink, parentPost }, blockNum) {
        if (!parentPost.author || parentPost.author === author) {
            return;
        }

        if (await Event.findOne({ eventType: 'reply', permlink, fromUsers: author })) {
            return;
        }

        if (await this._isInBlackList(author, parentPost.author)) {
            return;
        }

        let comment, post, actor, parentComment;

        const response = await this.callPrismService({
            contentId: {
                userId: parentPost.author,
                refBlockNum: parentPost.ref_block_num,
                permlink: parentPost.permlink,
            },
            userId: author,
        });

        actor = response.user;
        post = response.post;
        parentComment = response.comment;

        const contentResponse = await this.callPrismService({
            contentId: {
                userId: author,
                refBlockNum,
                permlink,
            },
        });
        comment = contentResponse.comment;

        const type = 'reply';

        const model = new Event({
            blockNum,
            refBlockNum,
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
}

module.exports = Reply;
