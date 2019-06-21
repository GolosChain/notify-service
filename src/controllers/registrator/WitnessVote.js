const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class WitnessVote extends Abstract {
    async handleVote({ voter: from, witness: user }, context) {
        await this._handle({ from, user, eventType: 'witnessVote' }, context);
    }

    async handleUnvote({ voter: from, witness: user }, context) {
        await this._handle({ from, user, eventType: 'witnessCancelVote' }, context);
    }

    async _handle({ from, user, eventType }, { blockNum, transactionId, app }) {
        if (await this._isInBlackList(from, user, app)) {
            return;
        }

        await this.waitForTransaction(transactionId, 1);

        let actor;

        try {
            const response = await this.callPrismService({ userId: from }, app);

            actor = response.user;
        } catch (error) {
            return;
        }

        const model = await Event.create({ blockNum, user, eventType, actor, fromUsers: [from] });

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = WitnessVote;
