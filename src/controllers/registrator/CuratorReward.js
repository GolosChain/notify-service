const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class CuratorReward extends Abstract {
    static async handle(
        { curator: user, reward, comment_author: author, comment_permlink: permlink },
        blockNum
    ) {
        reward = parseFloat(reward);

        this.emit('curatorReward', user, { author, permlink, reward });

        const model = new Event({
            blockNum,
            user,
            eventType: 'curatorReward',
            permlink,
            curatorReward: reward,
            curatorTargetAuthor: author,
        });

        await model.save();
    }
}

module.exports = CuratorReward;
