const Event = require('../models/Event');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.statsClient;
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const BlockSubscribeRestore = core.services.BlockSubscribeRestore;

const Reward = require('../controllers/registrator/Reward');
const CuratorReward = require('../controllers/registrator/CuratorReward');
const Mention = require('../controllers/registrator/Mention');
const Message = require('../controllers/registrator/Message');
const Reply = require('../controllers/registrator/Reply');
const Repost = require('../controllers/registrator/Repost');
const Subscribe = require('../controllers/registrator/Subscribe');
const Transfer = require('../controllers/registrator/Transfer');
const Vote = require('../controllers/registrator/Vote');
const WitnessVote = require('../controllers/registrator/WitnessVote');
const DeleteComment = require('../controllers/registrator/DeleteComment');

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

        this._debugBlockCounter = 0;
    }

    async start() {
        await this.restore();

        const subscribe = new BlockSubscribe();

        this.addNested(subscribe);

        await subscribe.start((data, blockNum) => {
            this._debugBlockCounter++;

            if (this._debugBlockCounter === 2000) {
                Logger.info(`Register ${this._debugBlockCounter} blocks`);
                this._debugBlockCounter = 0;
            }

            try {
                this._restorer.trySync(data, blockNum);
                this._handleBlock(data, blockNum);
            } catch (error) {
                Logger.error(`WTF in block subscribe - ${error}`);
            }
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
        Logger.error(`Load block error - ${error}`);
        process.exit(1);
    }

    _handleBlock(data, blockNum) {
        this._eachRealOperation(data, operation => {
            this._routeRealEventHandlers(operation, blockNum).catch(error => {
                Logger.error(`Event handler error - ${error}`);
                process.exit(1);
            });
        });

        this._eachVirtualOperation(data, operation => {
            this._routeVirtualEventHandlers(operation, blockNum).catch(error => {
                Logger.error(`Virtual event handler error - ${error}`);
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
                if (i > 100) {
                    Logger.error('Virtual operation cycle > 100');
                }

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
