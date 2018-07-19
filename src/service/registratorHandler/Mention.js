const core = require('griboyedov');
const Moments = core.Moments;
const Abstract = require('./Abstract');
const Event = require('../../model/Event');

class Mention extends Abstract {
    static async handle(
        { author, title, body, permlink, parent_permlink: parentPermlink },
        blockNum
    ) {
        const users = this._extractMention(title, body);

        for (let user of users) {
            this.emit('mention', user, { permlink });

            let model = await Event.findOne({
                eventType: 'mention',
                user,
                parentPermlink,
                createdAt: { $gt: Moments.currentDayStart },
            });

            if (model) {
                await this._incrementModel(model, author);
            } else {
                model = new Event({
                    blockNum,
                    user,
                    eventType: 'mention',
                    permlink,
                    parentPermlink,
                    fromUsers: [author],
                });

                await model.save();
            }
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
