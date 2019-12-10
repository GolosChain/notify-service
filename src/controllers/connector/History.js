const Event = require('../../models/Event');
const eventTypes = require('../../data/eventTypes');

const MAX_HISTORY_LIMIT = 100;

class History {
    async getHistory({ user, app, fromId, limit, types, markAsViewed, freshOnly }) {
        this._validateHistoryRequest(limit, types);

        const query = { user, app };

        if (!types.includes('all')) {
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
            total: await this._getTotal(user, app),
            totalByTypes: await this._getTotalByTypes(user, app, types),
            fresh: await this._getFresh(user, app),
            freshByTypes: await this._getFreshByTypes(user, app, types),
            unread: await this._getUnread(user, app),
            unreadByTypes: await this._getUnreadByTypes(user, app, types),
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

    async getHistoryFresh({ user, app, types }) {
        this._validateTypes(types);

        return {
            fresh: await this._getFresh(user, app),
            freshByTypes: await this._getFreshByTypes(user, app, types),
        };
    }

    async _getTotal(user, app) {
        return await this._getCountBy({ user, app });
    }

    async _getTotalByTypes(user, app, types) {
        const result = { summary: 0 };

        for (let eventType of this._eachType(types)) {
            result[eventType] = await this._getCountBy({ user, app, eventType });
            result.summary += result[eventType];
        }

        return result;
    }

    async _getFresh(user, app) {
        return await this._getCountBy({ user, app, fresh: true });
    }

    async _getFreshByTypes(user, app, types) {
        const result = { summary: 0 };

        for (let eventType of this._eachType(types)) {
            result[eventType] = await this._getCountBy({ user, app, eventType, fresh: true });
            result.summary += result[eventType];
        }

        return result;
    }

    async _getUnread(user, app) {
        return await this._getCountBy({ user, app, unread: true });
    }

    async _getUnreadByTypes(user, app, types) {
        const result = { summary: 0 };

        for (const eventType of this._eachType(types)) {
            result[eventType] = await this._getCountBy({ user, app, eventType, unread: true });
            result.summary += result[eventType];
        }

        return result;
    }

    *_eachType(types) {
        if (types.includes('all')) {
            types = eventTypes;
        }

        for (const eventType of types) {
            yield eventType;
        }
    }

    async _getCountBy(query) {
        return await Event.find(query).countDocuments();
    }

    async markAsViewed({ ids, user, app }) {
        const freshOffPromises = [];
        for (let id of ids) {
            freshOffPromises.push(this._freshOffWithUser(id, user));
        }
        await Promise.all(freshOffPromises);
    }

    async markAllAsViewed({ user, app }) {
        await this._allFreshOffForUser(user, app);
    }

    async markAsRead({ ids, user, app }) {
        await Promise.all(ids.map(id => this._markReadWithUser(id, user, app)));
    }

    async markAllAsRead({ user, app }) {
        await this._allMarkReadForUser(user, app);
    }

    _validateHistoryRequest(limit, types) {
        if (limit <= 0) {
            throw { code: 400, message: 'Limit <= 0' };
        }

        if (limit > MAX_HISTORY_LIMIT) {
            throw { code: 400, message: `Limit > ${MAX_HISTORY_LIMIT}` };
        }

        if (!Array.isArray(types)) {
            throw { code: 400, message: 'Bad types' };
        }

        this._validateTypes(types);
    }

    _validateTypes(types) {
        if (types.includes('all')) {
            return;
        }

        for (const type of types) {
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

    async _allFreshOffForUser(user, app) {
        await Event.updateMany({ user, app }, { $set: { fresh: false } });
    }
    async _markRead(_id) {
        await this._markReadByQuery({ _id });
    }

    async _markReadWithUser(_id, user, app) {
        await this._markReadByQuery({ _id, user, app });
    }

    async _markReadByQuery(query) {
        await Event.update(query, { $set: { unread: false } });
    }

    async _allMarkReadForUser(user, app) {
        await Event.updateMany({ user, app }, { $set: { unread: false } });
    }
}

module.exports = History;
