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
const DeleteContent = require('../controllers/registrator/DeleteContent');

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
        this._deleteContent = new DeleteContent({ connector });

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

        const subscribe = new BlockSubscribe({
            handler: ({ type, data }) => {
                if (type === BlockSubscribe.EVENT_TYPES.BLOCK) {
                    this._handleBlock(data, data.blockNum);
                }
            },
        });

        this.addNested(subscribe);

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

    // TODO Add allowed contract names
    async _routeEventHandlers({ type, receiver, ...body }, blockNum, blockTime, transactionId) {
        try {
            const app = this._getAppType(type);
            const context = { blockNum, blockTime, transactionId, app, receiver };
            const args = body.args;

            switch (type) {
                case 'gls.social->pin':
                    await this._subscribe.handleSubscribe(args, context);
                    break;
                case 'gls.social->unpin':
                    await this._subscribe.handleUnsubscribe(args, context);
                    break;
                case 'gls.publish->upvote':
                    await this._vote.handleUpVote(args, context);
                    break;
                case 'gls.publish->downvote':
                    await this._vote.handleDownVote(args, context);
                    break;
                case 'cyber.token->transfer':
                case 'cyber.token->payment':
                    await this._transfer.handleEvent(args, context);
                    await this._reward.handleEvent(args, context);
                    break;

                case 'cyber.token->bulktransfer':
                case 'cyber.token->bulkpayment':
                    for (const recipient of args.recipients) {
                        const data = {
                            ...args,
                            ...recipient,
                        };
                        await this._transfer.handleEvent(data, context);
                        await this._reward.handleEvent(data, context);
                    }
                    break;

                case 'gls.publish->createmssg':
                    await this._reply.handleEvent(args, context);
                    await this._mention.handleEvent(args, context);
                    break;

                case 'gls.publish->reblog':
                    await this._repost.handleEvent(args, context);
                    break;

                case 'gls.ctrl->votewitness':
                    await this._witnessVote.handleVote(args, context);
                    break;

                case 'gls.ctrl->unvotewitn':
                    await this._witnessVote.handleUnvote(args, context);
                    break;

                case 'gls.publish->deletemssg':
                    await this._deleteContent.handleEvent(args);
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
                receiver,
                body,
            };

            throw error;
        }
    }

    _getAppType(type) {
        return 'gls';

        // TODO: rework when multiple apps support is required
    }
}

module.exports = Registrator;
