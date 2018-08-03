const core = require('gls-core-service');
const Moments = core.Moments;
const Abstract = require('./Abstract');
const Event = require('../../model/Event');

class Subscribe extends Abstract {
    static async handle(rawData, blockNum) {
        const { eventType, user, follower } = this._tryExtractSubscribe(rawData);

        if (!user) {
            return;
        }

        this.emit(eventType, user, { follower });

        await this._saveSubscribe({ eventType, user, follower }, blockNum);
    }

    static _tryExtractSubscribe(rawData) {
        const { type, user: follower, data } = this._parseCustomJson(rawData);

        if (type !== 'follow') {
            return {};
        }

        try {
            if (data[0] !== 'follow') {
                return {};
            }

            const actionTypes = data[1].what;
            const user = data[1].following;
            let eventType;

            if (~actionTypes.indexOf('blog')) {
                eventType = 'subscribe';
            } else {
                eventType = 'unsubscribe';
            }

            return { eventType, user, follower };
        } catch (error) {
            logger.log(`Bad follow from - ${follower}`);
            return {};
        }
    }

    static async _saveSubscribe({ eventType, user, follower }, blockNum) {
        let model = await Event.findOne({
            eventType,
            user,
            createdAt: { $gt: Moments.currentDayStart },
        });

        if (model) {
            await this._incrementModel(model, follower);
        } else {
            model = new Event({
                blockNum,
                user,
                eventType,
                fromUsers: [follower],
            });

            await model.save();
        }
    }
}

module.exports = Subscribe;
