const core = require('griboyedov');
const BasicService = core.service.Basic;
const Gate = core.service.Gate;
const env = require('../Env');

class Notifier extends BasicService {
    constructor(userEventEmitter) {
        super();

        this._gate = new Gate();
        this._userEventEmitter = userEventEmitter;
        this._userMapping = new Map(); // user -> channelId -> requestId
        this._accumulator = new Map(); // user -> type -> [data]
    }

    async start() {
        const emitter = this._userEventEmitter;
        const online = this._filterOnline.bind(this);

        await this._gate.start({
            serverRoutes: {
                subscribe: this._registerSubscribe.bind(this),
                unsubscribe: this._registerUnsubscribe.bind(this),
            },
            requiredClients: this._gate.makeDefaultRequiredClientsConfig(),
        });

        this.addNested(this._gate);

        emitter.on('vote', online(this._handleVote));
        emitter.on('flag', online(this._handleFlag));
        emitter.on('transfer', online(this._handleTransfer));
        emitter.on('reply', online(this._handleReply));

        emitter.on('blockDone', this._broadcast.bind(this));
    }

    async stop() {
        await this.stopNested();
    }

    _handleVote(user, voter, permlink) {
        const acc = this._accumulatorBy(user, 'vote');

        if (acc.length) {
            acc[0].counter++;
        } else {
            acc.push({ voter, permlink, counter: 1 });
        }
    }

    _handleFlag(user, voter, permlink) {
        const acc = this._accumulatorBy(user, 'flag');

        if (acc.length) {
            acc[0].counter++;
        } else {
            acc.push({ voter, permlink, counter: 1 });
        }
    }

    _handleTransfer(user, from, amount) {
        this._accumulatorBy(user, 'transfer').push({ from, amount });
    }

    _handleReply(user, author, permlink) {
        const acc = this._accumulatorBy(user, 'reply');

        if (acc.length) {
            acc[0].counter++;
        } else {
            acc.push({ author, permlink, counter: 1 });
        }
    }

    _filterOnline(fn) {
        return (user, ...args) => {
            if (this._userMapping.get(user)) {
                fn.call(this, user, ...args);
            }
        };
    }

    _accumulatorBy(user, type) {
        const acc = this._accumulator;

        if (!acc.get(user)) {
            acc.set(user, new Map());
        }

        if (!acc.get(user).get(type)) {
            acc.get(user).set(type, []);
        }

        return acc.get(user).get(type);
    }

    _cleanAccumulator() {
        this._accumulator = {};
    }

    _broadcast() {
        // TODO -
    }

    _registerSubscribe(data) {
        const map = this._userMapping;
        const { user, channelId, requestId } = data;

        if (!map.get(user)) {
            map.set(user, new Map());
        }

        map.get(user).set(channelId, requestId);

        return 'Ok';
    }

    _registerUnsubscribe(data) {
        const map = this._userMapping;
        const { user, channelId } = data;

        map.get(user).delete(channelId);

        if (!map.get(user).size) {
            map.delete(user);
        }

        return 'Ok';
    }
}

module.exports = Notifier;
