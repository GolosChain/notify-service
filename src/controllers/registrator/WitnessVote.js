const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class WitnessVote extends Abstract {
    async handleVote({ voter: from, witness: user }, context) {
        await this._handle({ from, user, eventType: 'witnessVote' }, context);
    }

    async handleUnvote({ voter: from, witness: user }, context) {
        await this._handle({ from, user, eventType: 'witnessCancelVote' }, context);
    }

    async _handle({ from, user, eventType }, { blockNum, blockTime, app }) {
        await super._handle({}, blockNum);

        if (await this._isInBlackList(from, user, app)) {
            return;
        }

        const meta = await this.getEntityMetaData({ userId: from }, app);
        const model = await Event.create({
            blockNum,
            blockTime,
            user,
            eventType,
            actor: meta.user,
            fromUsers: [from],
            app,
        });

        this.emit('registerEvent', user, model.toObject());
    }
}

module.exports = WitnessVote;
