const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class DeleteContent extends Abstract {
    async handleEvent({ message_id: { author: userId, permlink } }) {
        const contentId = { userId, permlink };

        await Event.remove({
            $or: [{ 'post.contentId': contentId }, { 'comment.contentId': contentId }],
        });
    }
}

module.exports = DeleteContent;
