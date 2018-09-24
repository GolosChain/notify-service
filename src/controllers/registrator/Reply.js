const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reply extends Abstract {
    static async handle(
        { parent_author: user, parent_permlink: parentPermlink, author, permlink },
        blockNum
    ) {
        if (!user || user === author) {
            return;
        }

        this.emit('reply', user, { author, permlink });

        const model = new Event({
            blockNum,
            user,
            eventType: 'reply',
            permlink,
            parentPermlink,
            fromUsers: [author],
        });

        await model.save();
    }
}

module.exports = Reply;
