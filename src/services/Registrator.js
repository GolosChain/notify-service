const Event = require('../models/Event');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.utils.statsClient;
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribeDirect;
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

        this._reward = new Reward();
        this._curatorReward = new CuratorReward();
        this._mention = new Mention();
        this._message = new Message();
        this._reply = new Reply();
        this._repost = new Repost();
        this._subscribe = new Subscribe();
        this._transfer = new Transfer();
        this._vote = new Vote();
        this._witnessVote = new WitnessVote();
        this._deleteComment = new DeleteComment();

        this.translateEmit(
            [
                this._reward,
                this._curatorReward,
                this._mention,
                this._message,
                this._reply,
                this._repost,
                this._subscribe,
                this._transfer,
                this._vote,
                this._witnessVote,
            ],
            'registerEvent'
        );
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
                await this._vote.handle(body, blockNum);
                break;

            case 'transfer':
                await this._transfer.handle(body, blockNum);
                break;

            case 'comment':
                await this._reply.handle(body, blockNum);
                await this._mention.handle(body, blockNum);
                break;

            case 'custom_json':
                await this._subscribe.handle(body, blockNum);
                await this._repost.handle(body, blockNum);
                break;

            case 'account_witness_vote':
                await this._witnessVote.handle(body, blockNum);
                break;

            case 'delete_comment':
                await this._deleteComment.handle(body);
                break;
        }
    }

    async _routeVirtualEventHandlers([type, body], blockNum) {
        switch (type) {
            case 'author_reward':
                await this._reward.handle(body, blockNum);
                break;

            case 'curation_reward':
                await this._curatorReward.handle(body, blockNum);
                break;
        }
    }
}

module.exports = Registrator;
