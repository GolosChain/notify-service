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
        this._eachRealOperation(data, async operation => {
            try {
                await this._routeEventHandlers(operation, blockNum);
            } catch (error) {
                const errJsonString = JSON.stringify(error, null, 2);
                error = errJsonString === '{}' ? error : errJsonString;
                Logger.error(
                    `Event handler error: \n${error}. Stack:${'\n' + error.stack || 'no stack'}`
                );
                process.exit(1);
            }
        });

        this.emit('blockDone');
    }

    _eachRealOperation(data, fn) {
        for (let transaction of data.transactions) {
            if (!transaction.actions) {
                continue;
            }
            for (let action of transaction.actions) {
                if (action) {
                    fn({ type: `${action.action}->${action.code}`, ...action });
                }
            }
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _routeEventHandlers({ type, ...body }, blockNum) {
        body = this._actionMapper(body);

        // wait for possible prism sync
        await this.wait(2000);

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

            case 'reblog->gls.publish':
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
            default:
                console.log('UNHANDLED,', type);
        }
    }

    _actionMapper(data) {
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
            user: data.args.pinner,
            follower: data.args.pinning,
            receiver: data.receiver,
            post,
            parentPost,
            ...data.args,
            ...data,
        };
    }
}

module.exports = Registrator;
