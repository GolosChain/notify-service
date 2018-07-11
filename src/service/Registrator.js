const Event = require('../model/Event');
const core = require('griboyedov');
const logger = core.Logger;
const stats = core.Stats.client;
const BasicService = core.service.Basic;
const BlockSubscribe = core.service.BlockSubscribe;
const BlockSubscribeRestore = core.service.BlockSubscribeRestore;

class Registrator extends BasicService {
    async start() {
        await this.restore();

        const subscribe = new BlockSubscribe();

        this.addNested(subscribe);

        await subscribe.start((data, blockNum) => {
            //this._restorer.trySync(data); TODO enable and test sync
            this._handleBlock(data, blockNum);
        });
    }

    async stop() {
        await this.stopNested();
    }

    async restore() {
        this._restorer = new BlockSubscribeRestore(
            Event,
            this._handleBlock.bind(this),
            this._handleBlockError.bind(this)
        );

        this.addNested(this._restorer);

        await this._restorer.start();
    }

    _handleBlockError(error) {
        stats.increment('block_registration_error');
        logger.error(`Load block error - ${error}`);
        process.exit(1);
    }

    _handleBlock(data, blockNum) {
        for (let transaction of data.transactions) {
            for (let operation of transaction.operations) {
                this._routeEventHandlers(operation, blockNum).catch(error => {
                    logger.error(`Event handler error - ${error}`);
                    process.exit(1);
                });
            }
        }

        this.emit('blockDone');
    }

    async _routeEventHandlers([type, body], blockNum) {
        // TODO reply | subscribe | unsubscribe | mention | repost | message
        switch (type) {
            case 'vote':
                await this._handleVoteAndFlag(body, blockNum);
                break;

            case 'transfer':
                await this._handleTransfer(body, blockNum);
                break;

            case 'author_reward':
                await this._handleAward(body, blockNum);
                break;

            case 'curation_reward':
                await this._handleCuratorAward(body, blockNum);
                break;
        }
    }

    async _handleVoteAndFlag({ voter, author, permlink, weight }, blockNum) {
        if (weight === 0) {
            return;
        }

        let type;

        if (weight > 0) {
            type = 'vote';
        } else {
            type = 'flag';
        }

        this.emit(type, voter, author, permlink, weight);

        let model = await Event.findOne({ eventType: type, permlink });

        if (model) {
            model.fromUsers.push(voter);
            model.counter += 1;
            model.fresh = true;
        } else {
            model = new Event({
                blockNum,
                user: author,
                eventType: 'vote',
                fresh: true,
                counter: 1,
                permlink: permlink,
                fromUsers: [voter],
            });
        }

        await model.save();
    }

    async _handleTransfer({from, to, amount}, blockNum) {
        this.emit('transfer', from, to, amount);

        const model = new Event({
            blockNum,
            user: to,
            eventType: 'transfer',
            fresh: true,
            fromUsers: [from],
            amount,
        });

        await model.save();
    }

    async _handleReply(data, blockNum) {
        // TODO ---
    }

    async _handleSubscribe(data, blockNum) {
        // TODO ---
    }

    async _handleUnsubscribe(data, blockNum) {
        // TODO ---
    }

    async _handleMention(data, blockNum) {
        // TODO ---
    }

    async _handleRepost(data, blockNum) {
        // TODO ---
    }

    async _handleAward(data, blockNum) {
        // TODO -
    }

    async _handleCuratorAward(data, blockNum) {
        // TODO -
    }

    async _handleMessage(data, blockNum) {
        // TODO ---
    }
}

module.exports = Registrator;
