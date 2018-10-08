const Event = require('../../models/Event');
const eventTypes = require('../../data/eventTypes');

const MAX_HISTORY_LIMIT = 100;

class History {
    async getHistory({
        user,
        fromId = null,
        limit = 10,
        types = 'all',
        markAsViewed = true,
        freshOnly = false,
    }) {
        this._validateHistoryRequest(limit, types);

        const query = { user };

        if (types !== 'all') {
            query.eventType = types;
        }

        if (fromId) {
            query._id = { $lt: fromId };
        }

        if (freshOnly) {
            query.fresh = true;
        }

        const data = await this._getEventsHistoryBy(query, limit);

        if (markAsViewed) {
            for (let event of data) {
                await this._freshOff(event._id);
            }
        }

        return {
            total: await this._getTotal(user),
            totalByTypes: await this._getTotalByTypes(user, types),
            fresh: await this._getFresh(user),
            freshByTypes: await this._getFreshByTypes(user, types),
            data,
        };
    }

    async _getEventsHistoryBy(query, limit) {
        return await Event.find(
            query,
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
    }

    async getHistoryFresh({ user, types = 'all' }) {
        this._validateTypes(types);

        return {
            fresh: await this._getFresh(user),
            freshByTypes: await this._getFreshByTypes(user, types),
        };
    }

    async _getTotal(user) {
        return await this._getCountBy({ user });
    }

    async _getTotalByTypes(user, types) {
        const result = { summary: 0 };

        for (let eventType of this._eachType(types)) {
            result[eventType] = await this._getCountBy({ user, eventType });
            result.summary += result[eventType];
        }

        return result;
    }

    async _getFresh(user) {
        return await this._getCountBy({ user, fresh: true });
    }

    async _getFreshByTypes(user, types) {
        const result = { summary: 0 };

        for (let eventType of this._eachType(types)) {
            result[eventType] = await this._getCountBy({ user, eventType, fresh: true });
            result.summary += result[eventType];
        }

        return result;
    }

    *_eachType(types) {
        if (types === 'all') {
            types = eventTypes;
        }

        for (let eventType of types) {
            yield eventType;
        }
    }

    async _getCountBy(query) {
        return await Event.find(query).countDocuments();
    }

    async markAsViewed({ ids = [], user }) {
        for (let id of ids) {
            await this._freshOffWithUser(id, user);
        }
    }

    async markAllAsViewed({ user }) {
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

        this._validateTypes(types);
    }

    _validateTypes(types) {
        if (types === 'all') {
            return;
        }

        for (let type of types) {
            if (!eventTypes.includes(type)) {
                throw { code: 400, message: `Bad type - ${type || 'null'}` };
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
        await Event.update(query, { $set: { fresh: false } });
    }

    async _allFreshOffForUser(user) {
        await Event.updateMany({ user }, { $set: { fresh: false } });
    }
}

module.exports = History;
