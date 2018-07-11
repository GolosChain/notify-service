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

        await subscribe.start(data => {
            //this._restorer.trySync(data); TODO enable and test sync
            this._handleBlock(data);
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

    _handleBlock(data) {
        for (let transaction of data.transactions) {
            for (let operation of transaction.operations) {
                const [type, body] = operation;

                // TODO reply | subscribe | unsubscribe | mention | repost | message
                switch (type) {
                    case 'vote':
                        this._handleVote(body);
                        this._handleFlag(body);
                        break;
                    case 'transfer':
                        this._handleTransfer(body);
                        break;
                    case 'author_reward':
                        this._handleAward(body);
                        break;
                    case 'curation_reward':
                        this._handleCuratorAward(body);
                        break;

                }
            }
        }

        // TODO -
        // TODO emit newUserEvent
    }

    _handleBlockError(error) {
        stats.increment('block_registration_error');
        logger.error(`Load block error - ${error}`);
        process.exit(1);
    }

    _handleVote() {
        // TODO -
    }

    _handleFlag() {
        // TODO -
    }

    _handleTransfer() {
        // TODO -
    }

    _handleReply() {
        // TODO ---
    }

    _handleSubscribe() {
        // TODO ---
    }

    _handleUnsubscribe() {
        // TODO ---
    }

    _handleMention() {
        // TODO ---
    }

    _handleRepost() {
        // TODO ---
    }

    _handleAward() {
        // TODO -
    }

    _handleCuratorAward() {
        // TODO -
    }

    _handleMessage() {
        // TODO ---
    }
}

module.exports = Registrator;
