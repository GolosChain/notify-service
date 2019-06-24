const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;

const Mention = require('../controllers/registrator/Mention');
const Reply = require('../controllers/registrator/Reply');
const Repost = require('../controllers/registrator/Repost');
const Subscribe = require('../controllers/registrator/Subscribe');
const Transfer = require('../controllers/registrator/Transfer');
const Reward = require('../controllers/registrator/Reward');
const Vote = require('../controllers/registrator/Vote');
const WitnessVote = require('../controllers/registrator/WitnessVote');
const DeleteComment = require('../controllers/registrator/DeleteComment');

class Registrator extends BasicService {
    constructor(connector) {
        super();

        this._mention = new Mention({ connector });
        this._reply = new Reply({ connector });
        this._repost = new Repost({ connector });
        this._subscribe = new Subscribe({ connector });
        this._transfer = new Transfer({ connector });
        this._reward = new Reward({ connector });
        this._vote = new Vote({ connector });
        this._witnessVote = new WitnessVote({ connector });
        this._deleteComment = new DeleteComment({ connector });

        this.translateEmit(
            [
                this._mention,
                this._reply,
                this._repost,
                this._subscribe,
                this._transfer,
                this._reward,
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

        subscribe.on('block', data => {
            this._handleBlock(data, data.blockNum);
        });

        await subscribe.start();
    }

    async stop() {
        await this.stopNested();
    }

    _handleBlock(data, blockNum) {
        this._eachBlock(data, async operation => {
            try {
                await this._routeEventHandlers(operation, blockNum, operation.transaction.id);
            } catch (error) {
                Logger.error('Operation routing error -- ', error);
                process.exit(1);
            }
        });

        this.emit('blockDone');
    }

    _eachBlock(data, fn) {
        for (const transaction of data.transactions) {
            if (!transaction) {
                continue;
            }

            if (!transaction.actions) {
                Logger.info('No actions', transaction);
                continue;
            }

            for (const action of transaction.actions) {
                if (action) {
                    fn({ type: `${action.code}->${action.action}`, ...action, transaction });
                } else {
                    Logger.info('No actions', JSON.stringify(transaction, null, 4));
                }
            }
        }
    }

    // TODO Change WaitForTransaction
    async _routeEventHandlers({ type, ...body }, blockNum, transactionId) {
        try {
            const app = this._getAppType(type);
            const context = { blockNum, transactionId, app };

            body = this._mapAction(body);

            switch (type) {
                case 'gls.social->pin':
                    await this._subscribe.handleSubscribe(body, context);
                    break;
                case 'gls.social->unpin':
                    await this._subscribe.handleUnsubscribe(body, context);
                    break;
                case 'gls.publish->upvote':
                    await this._vote.handleUpVote(body, context);
                    break;
                case 'gls.publish->downvote':
                    await this._vote.handleDownVote(body, context);
                    break;
                case 'cyber.token->transfer':
                    await this._transfer.handleEvent(body, context);
                    await this._reward.handleEvent(body, context);
                    break;

                case 'gls.publish->createmssg':
                    await this._reply.handleEvent(body, context);
                    await this._mention.handle(body, context);
                    break;

                case 'gls.publish->reblog':
                    await this._repost.handle(body, context);
                    break;

                case 'gls.ctrl->votewitness':
                    await this._witnessVote.handleVote(body, context);
                    break;

                case 'gls.ctrl->unvotewitn':
                    await this._witnessVote.handleUnvote(body, context);
                    break;

                case 'gls.publish->deletemssg':
                    await this._deleteComment.handleEvent(body);
                    break;

                default:
                    break;
            }
        } catch (error) {
            if (error.prismError) {
                Logger.warn('Prism error!', error);
                return;
            }

            error.identity = {
                type,
                body,
            };

            throw error;
        }
    }

    _mapAction(data) {
        data.args = data.args || {};

        if (data.args.message_id) {
            data.args.refBlockNum = data.args.message_id.ref_block_num;
        }

        const post = data.args.message_id;
        const parentPost = data.args.parent_id;

        data.args.message_id = data.args.message_id || {};
        data.args.parent_id = data.args.parent_id || {};

        return {
            author: data.args.message_id.author,
            title: data.args.headermssg,
            body: data.args.bodymssg,
            permlink: data.args.message_id.permlink,
            parent_permlink: data.args.parent_id.permlink,
            parent_author: data.args.parent_id.author,
            user: data.args.pinning,
            follower: data.args.pinner,
            receiver: data.receiver,
            post,
            parentPost,
            ...data.args,
            ...data,
        };
    }

    _getAppType(type) {
        const contractPrefix = type.split('.')[0];

        if (contractPrefix === 'gls') {
            return 'gls';
        } else {
            return 'cyber';
        }
    }
}

module.exports = Registrator;
