const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reply extends Abstract {
    async handle(
        { parent_author: user, parent_permlink: parentPermlink, author, permlink },
        blockNum
    ) {
        if (!user || user === author) {
            return;
        }

        const model = new Event({
            blockNum,
            user,
            eventType: 'reply',
            permlink,
            parentPermlink,
            fromUsers: [author],
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Reply;
