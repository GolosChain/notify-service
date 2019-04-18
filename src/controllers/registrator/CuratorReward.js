const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class CuratorReward extends Abstract {
    async handle(
        { curator: user, reward, comment_author: author, comment_permlink: permlink, refBlockNum },
        blockNum,
        transaction,
        transactionId
    ) {
        // TODO: wait for blockchain
        reward = parseFloat(reward);

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType: 'curatorReward',
            permlink,
            curatorReward: reward,
            curatorTargetAuthor: author,
        });

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = CuratorReward;
