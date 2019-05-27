const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Subscribe extends Abstract {
    async handle({ user, follower, contractName }, eventType, blockNum, transactionId) {
        await this.waitForTransaction(transactionId);

        if (!user || user === follower) {
            return;
        }

        if (await this._isInBlackList(follower, user)) {
            return;
        }
        let actor;
        // TODO: check if it is a community or a user
        try {
            const response = await this.callPrismService(
                {
                    userId: follower,
                },
                contractName
            );

            actor = response.user;
        } catch (error) {
            return;
        }

        const model = new Event({
            blockNum,
            user,
            eventType,
            fromUsers: [follower],
            actor,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Subscribe;
