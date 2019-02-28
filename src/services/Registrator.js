const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.utils.statsClient;
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;

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

        await subscribe.start();

        subscribe.on('block', data => {
            this._handleBlock(data, data.blockNum);
        });
    }

    async stop() {
        await this.stopNested();
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

        this.emit('blockDone');
    }

    _eachRealOperation(data, fn) {
        for (let transaction of data.transactions) {
            if (!transaction) {
                continue;
            }
            for (let action of transaction.actions) {
                if (action) {
                    fn({ type: `${action.action}->${action.code}`, ...action });
                }
            }
        }
    }

    async _routeRealEventHandlers({ type, ...body }, blockNum) {
        body = this._publishMapper(body);

        switch (type) {
            case 'pin->gls.social':
                await this._subscribe.handle(body, 'subscribe', blockNum);
                break;
            case 'unpin->gls.social':
                await this._subscribe.handle(body, 'unsubscribe', blockNum);
                break;
            case 'upvote->gls.publish':
            case 'downvote->gls.publish':
                await this._vote.handle(body, blockNum);
                break;

            case 'transfer->cyber.token':
                await this._transfer.handle(body, blockNum);
                break;

            case 'createmssg->gls.publish':
                await this._reply.handle(body, blockNum);
                await this._mention.handle(body, blockNum);
                break;

            case 'custom_json':
                //TODO: add repost support
                await this._repost.handle(body, blockNum);
                break;

            case 'account_witness_vote':
                //TODO: add witness support
                await this._witnessVote.handle(body, blockNum);
                break;

            case 'deletemssg->gls.publish':
                await this._deleteComment.handle(body);
                break;

            case 'author_reward':
                // TODO: add author reward support
                await this._reward.handle(body, blockNum);
                break;

            case 'curation_reward':
                // TODO: add curation reward support
                await this._curatorReward.handle(body, blockNum);
                break;
        }
    }

    _publishMapper(data) {
        data.args = data.args || {};

        data.args.message_id = data.args.message_id || {};
        data.args.parent_id = data.args.parent_id || {};

        return {
            author: data.args.message_id.author,
            title: data.args.headermssg,
            body: data.args.bodymssg,
            permlink: data.args.message_id.permlink,
            parent_permlink: data.args.parent_id.permlink,
            parent_author: data.args.parent_id.author,
            user: data.args.pinner,
            follower: data.args.pinning,
            ...data.args,
        };
    }
}

module.exports = Registrator;
