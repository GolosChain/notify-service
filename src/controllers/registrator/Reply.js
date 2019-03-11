const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reply extends Abstract {
    async handle(
        { parent_author: user, parent_permlink: parentPermlink, refBlockNum, author, permlink },
        blockNum
    ) {
        if (!user || user === author) {
            return;
        }

        if (await Event.findOne({ eventType: 'reply', permlink, fromUsers: author })) {
            return;
        }

        if (await this._isInBlackList(author, user)) {
            return;
        }

        const type = 'reply';

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: type,
            permlink,
            parentPermlink,
            fromUsers: [author],
            //TODO: make real call
            ...(await this.callService('prism', `prism.${type}`, {})),
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Reply;
