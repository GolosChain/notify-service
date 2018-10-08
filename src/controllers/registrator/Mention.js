const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Mention extends Abstract {
    static async handle(
        {
            author,
            title,
            body,
            permlink,
            parent_permlink: parentPermlink,
            parent_author: parentAuthor,
        },
        blockNum
    ) {
        const users = this._extractMention(title, body);

        for (let user of users) {
            if (user === author || user === parentAuthor) {
                continue;
            }

            const model = new Event({
                blockNum,
                user,
                eventType: 'mention',
                permlink,
                parentPermlink,
                fromUsers: [author],
            });

            await model.save();

            this.emit('registerEvent', user, model.toObject());
        }
    }

    static _extractMention(title, body) {
        const re = /(@[a-z][-\.a-z\d]+[a-z\d])/gi;
        const inTitle = title.match(re) || [];
        const inBody = body.match(re) || [];
        const totalRaw = inTitle.concat(inBody);
        const total = totalRaw.map(v => v.slice(1));

        return new Set(total);
    }
}

module.exports = Mention;
