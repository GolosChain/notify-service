const Event = require('../model/Event');
const core = require('gls-core-service');
const logger = core.Logger;
const stats = core.Stats.client;
const BasicService = core.service.Basic;
const BlockSubscribe = core.service.BlockSubscribe;
const BlockSubscribeRestore = core.service.BlockSubscribeRestore;

const Reward = require('./registratorHandler/Reward');
const CuratorReward = require('./registratorHandler/CuratorReward');
const Mention = require('./registratorHandler/Mention');
const Message = require('./registratorHandler/Message');
const Reply = require('./registratorHandler/Reply');
const Repost = require('./registratorHandler/Repost');
const Subscribe = require('./registratorHandler/Subscribe');
const Transfer = require('./registratorHandler/Transfer');
const Vote = require('./registratorHandler/Vote');
const WitnessVote = require('./registratorHandler/WitnessVote');
const DeleteComment = require('./registratorHandler/DeleteComment');

class Registrator extends BasicService {
    constructor() {
        super();

        this.translateEmit(Reward, 'reward');
        this.translateEmit(CuratorReward, 'curatorReward');
        this.translateEmit(Mention, 'mention');
        this.translateEmit(Message, 'message');
        this.translateEmit(Reply, 'reply');
        this.translateEmit(Repost, 'repost');
        this.translateEmit(Subscribe, 'subscribe', 'unsubscribe');
        this.translateEmit(Transfer, 'transfer');
        this.translateEmit(Vote, 'vote', 'flag');
        this.translateEmit(WitnessVote, 'witnessVote', 'witnessCancelVote');
        /* no translate for DeleteComment handler */
    }

    async start() {
        await this.restore();

        const subscribe = new BlockSubscribe();

        this.addNested(subscribe);

        await subscribe.start((data, blockNum) => {
            this._restorer.trySync(data, blockNum);
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
        this._eachRealOperation(data, operation => {
            this._routeRealEventHandlers(operation, blockNum).catch(error => {
                logger.error(`Event handler error - ${error}`);
                process.exit(1);
            });
        });

        this._eachVirtualOperation(data, operation => {
            this._routeVirtualEventHandlers(operation, blockNum).catch(error => {
                logger.error(`Virtual event handler error - ${error}`);
                process.exit(1);
            });
        });

        this.emit('blockDone');
    }

    _eachRealOperation(data, fn) {
        for (let transaction of data.transactions) {
            for (let operation of transaction.operations) {
                fn(operation);
            }
        }
    }

    _eachVirtualOperation(data, fn) {
        if (!data._virtual_operations) {
            return;
        }

        for (let virtual of data._virtual_operations) {
            const operations = virtual.op;
            let type = null;

            for (let i = 0; i < operations.length; i++) {
                if (i % 2) {
                    fn([type, operations[i]]);
                } else {
                    type = operations[i];
                }
            }
        }
    }

    async _routeRealEventHandlers([type, body], blockNum) {
        switch (type) {
            case 'vote':
                await Vote.handle(body, blockNum);
                break;

            case 'transfer':
                await Transfer.handle(body, blockNum);
                break;

            case 'comment':
                await Reply.handle(body, blockNum);
                await Mention.handle(body, blockNum);
                break;

            case 'custom_json':
                await Subscribe.handle(body, blockNum);
                await Repost.handle(body, blockNum);
                break;

            case 'account_witness_vote':
                await WitnessVote.handle(body, blockNum);
                break;

            case 'delete_comment':
                await DeleteComment.handle(body);
                break;
        }
    }

    async _routeVirtualEventHandlers([type, body], blockNum) {
        switch (type) {
            case 'author_reward':
                await Reward.handle(body, blockNum);
                break;

            case 'curation_reward':
                await CuratorReward.handle(body, blockNum);
                break;
        }
    }
}

module.exports = Registrator;
