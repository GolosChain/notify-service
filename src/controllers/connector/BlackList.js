const User = require('../../models/User');

class BlackList {
    async get({ owner }) {
        await this._initUser(owner);

        const model = await User.find({ name: owner }, { blackList: true });

        return model.blackList;
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
        let userModel = await User.find({ name });

        if (!userModel) {
            userModel = new User({ name });

            await userModel.save();
        }
    }
}

module.exports = BlackList;
