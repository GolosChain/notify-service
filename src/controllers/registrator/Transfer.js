const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Transfer extends Abstract {
    async handleEvent(
        { to: user, from, quantity, memo },
        { blockNum, blockTime, app: contractName, receiver }
    ) {
        await super._handle({}, blockNum);

        if (from === `${contractName}.publish` && user === `${contractName}.vesting`) {
            return;
        }

        if (user !== receiver) {
            return;
        }

        const { amount, currency } = this._parseQuantity(quantity);
        const apps = ['cyber'];

        if (currency === 'GOLOS') {
            apps.push('gls');
        }

        for (const app of apps) {
            if (await this._isInBlackList(from, user, app)) {
                continue;
            }

            const { user: actor } = await this.getEntityMetaData({ userId: from }, app);
            const model = new Event({
                blockNum,
                blockTime,
                user,
                eventType: 'transfer',
                fromUsers: [from],
                actor,
                value: { amount, currency },
                app,
            });

            await model.save();

            this.emit('registerEvent', user, model.toObject());
        }
    }

    _parseQuantity(quantity) {
        const [amount, currency] = quantity.split(' ');

        return { amount, currency };
    }
}

module.exports = Transfer;
