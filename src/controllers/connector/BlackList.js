const User = require('../../models/User');

class BlackList {
    async get({ owner, app }) {
        await this._initUser(owner, app);

        const model = await User.findOne({ name: owner, app }, { blackList: true });

        return { blackList: model.blackList || [] };
    }

    async add({ owner, app, banned }) {
        await this._initUser(owner, app);

        await User.updateOne({ name: owner, app }, { $addToSet: { blackList: banned } });
    }

    async remove({ owner, app, banned }) {
        await this._initUser(owner, app);

        await User.updateOne({ name: owner, app }, { $pull: { blackList: banned } });
    }

    async _initUser(name, app) {
        await User.updateOne({ name, app }, { $set: { name } }, { upsert: true });
    }
}

module.exports = BlackList;
