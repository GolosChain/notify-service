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
            refBlockNum,
        },
        blockNum
    ) {
        const users = this._extractMention(title, body);

        for (let user of users) {
            if (user === author || user === parentAuthor) {
                continue;
            }

            if (
                await Event.findOne({
                    eventType: 'mention',
                    permlink,
                    fromUsers: author,
                    user,
                })
            ) {
                return;
            }

            if (await this._isInBlackList(author, user)) {
                continue;
            }

            const type = 'mention';

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

    _extractMention(title, body) {
        const re = /(@[a-z][-\.a-z\d]+[a-z\d])/gi;
        const inTitle = title.match(re) || [];
        const inBody = body.match(re) || [];
        const totalRaw = inTitle.concat(inBody);
        const total = totalRaw.map(v => v.slice(1));

        return new Set(total);
    }
}

module.exports = Mention;
