const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class WitnessVote extends Abstract {
    async handle(
        { voter: from, witness: user, refBlockNum, type = 'unvote' },
        blockNum,
        transactionId
    ) {
        if (await this._isInBlackList(from, user)) {
            return;
        }

        await this.waitForTransaction(transactionId, 1);

        let eventType;

        if (type === 'vote') {
            eventType = 'witnessVote';
        } else {
            eventType = 'witnessCancelVote';
        }

        let actor;

        try {
            const response = await this.callPrismService({
                userId: from,
            });
            actor = response.user;
        } catch (error) {
            // return;
            try {
                from = await this.resolveName(from);
                const response = await this.callPrismService({
                    userId: from,
                });
                actor = response.user;
            } catch (error) {
                return;
            }
        }

        const model = new Event({
            blockNum,
            refBlockNum,
            user,
            eventType,
            actor,
            fromUsers: [from],
        });

        console.log(model.toObject());

        await model.save();

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = WitnessVote;
