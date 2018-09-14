const Event = require('../../models/Event');

const MAX_HISTORY_LIMIT = 100;
const FRESH_OFF_ACTION = { $set: { fresh: false } };

class History {
    async _getHistory({ user, fromId = null, limit = 10, types = 'all', markAsViewed = true }) {
        this._validateHistoryRequest(limit, types);

        const allQuery = { user };
        const freshQuery = { user, fresh: true };
        let historyQuery = { user, eventType: types };

        if (types === 'all') {
            historyQuery = allQuery;
        }

        const total = await Event.find(allQuery).countDocuments();
        const fresh = await Event.find(freshQuery).countDocuments();

        if (fromId) {
            historyQuery._id = { $lt: fromId };
        }

        const data = await Event.find(
            historyQuery,
            {
                __v: false,
                blockNum: false,
                user: false,
            },
            {
                limit,
                lean: true,
                sort: {
                    _id: -1,
                },
            }
        );

        if (markAsViewed) {
            for (let event of data) {
                await this._freshOff(event._id);
            }
        }

        return {
            total,
            fresh,
            data,
        };
    }

    async _getHistoryFresh({ user }) {
        return {
            fresh: await Event.find({ user, fresh: true }).countDocuments(),
        };
    }

    async _markAsViewed({ ids = [], user }) {
        for (let id of ids) {
            await this._freshOffWithUser(id, user);
        }
    }

    async _markAllAsViewed({ user }) {
        await this._allFreshOffForUser(user);
    }

    _validateHistoryRequest(limit, types) {
        if (limit <= 0) {
            throw { code: 400, message: 'Limit <= 0' };
        }

        if (limit > MAX_HISTORY_LIMIT) {
            throw { code: 400, message: `Limit > ${MAX_HISTORY_LIMIT}` };
        }

        if (!Array.isArray(types) && types !== 'all') {
            throw { code: 400, message: 'Bad types' };
        }

        if (types !== 'all') {
            for (let type of types) {
                if (!EVENT_TYPES.includes(type)) {
                    throw { code: 400, message: `Bad type - ${type || 'null'}` };
                }
            }
        }
    }

    async _freshOff(_id) {
        await this._freshOffByQuery({ _id });
    }

    async _freshOffWithUser(_id, user) {
        await this._freshOffByQuery({ _id, user });
    }

    async _freshOffByQuery(query) {
        await Event.update(query, FRESH_OFF_ACTION);
    }

    async _allFreshOffForUser(user) {
        await Event.updateMany({ user }, FRESH_OFF_ACTION);
    }
}

module.exports = History;
