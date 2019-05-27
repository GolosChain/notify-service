const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class WitnessVote extends Abstract {
    async handle(
        { voter: from, witness: user, type = 'unvote', contractName },
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
            const response = await this.callPrismService(
                {
                    userId: from,
                },
                contractName
            );
            actor = response.user;
        } catch (error) {
            try {
                // from = await this.resolveName(from);
                const response = await this.callPrismService(
                    {
                        userId: from,
                    },
                    contractName
                );
                actor = response.user;
            } catch (error) {
                return;
            }
        }

        const model = new Event({
            blockNum,
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
