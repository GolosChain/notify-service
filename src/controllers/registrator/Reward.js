const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Reward extends Abstract {
    async handle(
        {
            author: user,
            permlink,
            steem_payout: golos,
            vesting_payout: golosPower,
            sbd_payout: gbg,
            refBlockNum,
        },
        blockNum
    ) {
        // TODO: wait for blockchain
        golos = parseFloat(golos);
        golosPower = parseFloat(golosPower);
        gbg = parseFloat(gbg);

        const type = 'reward';

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: type,
            permlink,
            reward: { golos, golosPower, gbg },
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = Reward;
