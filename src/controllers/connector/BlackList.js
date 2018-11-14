const User = require('../../models/User');

class BlackList {
    async get({ owner }) {
        await this._initUser(owner);

        const model = await User.findOne({ name: owner }, { blackList: true });

        return { blackList: model.blackList || [] };
    }

    async add({ owner, banned }) {
        await this._initUser(owner);

        await User.updateOne({ name: owner }, { $addToSet: { blackList: banned } });
    }

    async remove({ owner, banned }) {
        await this._initUser(owner);

        await User.updateOne({ name: owner }, { $pull: { blackList: banned } });
    }

    async _initUser(name) {
        await User.updateOne({ name }, { $set: { name } }, { upsert: true });
    }
}

module.exports = BlackList;
