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
    constructor(connector) {
        super();

        this._reward = new Reward({ connector });
        this._curatorReward = new CuratorReward({ connector });
        this._mention = new Mention({ connector });
        this._message = new Message({ connector });
        this._reply = new Reply({ connector });
        this._repost = new Repost({ connector });
        this._subscribe = new Subscribe({ connector });
        this._transfer = new Transfer({ connector });
        this._vote = new Vote({ connector });
        this._witnessVote = new WitnessVote({ connector });
        this._deleteComment = new DeleteComment({ connector });

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
                await this._routeEventHandlers(
                    operation,
                    blockNum,
                    operation.transaction.id,
                    operation.transaction
                );
            } catch (error) {
                const errJsonString = JSON.stringify(error, null, 2);
                error = errJsonString === '{}' ? error : errJsonString;
                Logger.error(
                    `Event handler error:
                    ${error}
                    
                        Stack:
                        ${error.stack || 'no stack'}
                        
                        Identity:
                        ${error.identity || 'no identity provided'}
                        `
                );
                process.exit(1);
            }
        });

        this.emit('blockDone');
    }

    _eachBlock(data, fn) {
        for (const transaction of data.transactions) {
            if (!transaction) {
                Logger.warn('Missing transaction in', data);
                continue;
            }

            if (!transaction.actions) {
                Logger.info('No actions', transaction);
                continue;
            }

            for (const action of transaction.actions) {
                if (action) {
                    fn({ type: `${action.action}->${action.code}`, ...action, transaction });
                } else {
                    Logger.info('No actions', JSON.stringify(transaction, null, 4));
                }
            }
        }
    }

    async _routeEventHandlers({ type, ...body }, blockNum, transactionId, transaction) {
        try {
            body = this._mapAction(body, type);
            switch (type) {
                case 'pin->gls.social':
                    Logger.info(type);
                    await this._subscribe.handle(body, 'subscribe', blockNum, transactionId);
                    break;
                case 'unpin->gls.social':
                    Logger.info(type);
                    await this._subscribe.handle(body, 'unsubscribe', blockNum, transactionId);
                    break;
                case 'upvote->gls.publish':
                    Logger.info(type);
                    await this._vote.handle(body, blockNum, transactionId, 'upvote');
                    break;
                case 'downvote->gls.publish':
                    Logger.info(type);
                    await this._vote.handle(body, blockNum, transactionId, 'downvote');
                    break;
                case 'transfer->cyber.token':
                    Logger.info(type);
                    await this._transfer.handle(body, blockNum, transactionId);
                    break;

                case 'createmssg->gls.publish':
                    Logger.info(type);
                    await this._reply.handle(body, blockNum, transactionId);
                    await this._mention.handle(body, blockNum, transactionId);
                    break;

                case 'reblog->gls.publish':
                    Logger.info(type);
                    await this._repost.handle(body, blockNum, transactionId);
                    break;

                case 'votewitness->gls.ctrl':
                    await this._witnessVote.handle(
                        { ...body, type: 'vote' },
                        blockNum,
                        transactionId
                    );
                    break;

                case 'unvotewitn->gls.ctrl':
                    await this._witnessVote.handle(
                        { ...body, type: 'unvote' },
                        blockNum,
                        transactionId
                    );
                    break;

                case 'deletemssg->gls.publish':
                    Logger.info(type);
                    await this._deleteComment.handle(body);
                    break;

                default:
                    Logger.warn('Unhandled blockchain event: ', type);
                    break;
            }
        } catch (error) {
            error.identity = {
                type,
                body,
            };

            throw error;
        }
    }

    _mapAction(data, type) {
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
            contractName: type.split('->')[1].split('.')[0],
            ...data.args,
            ...data,
        };
    }
}

module.exports = Registrator;
