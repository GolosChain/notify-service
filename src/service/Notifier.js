const core = require('griboyedov');
const BasicService = core.service.Basic;

class Notifier extends BasicService {
    constructor(userEventEmitter) {
        super();

        this._userEventEmitter = userEventEmitter;
        this._userMapping = new Map();
        this._accumulator = {};
    }

    async start() {
        const emitter = this._userEventEmitter;
        const online = this._filterOnline.bind(this);

        // TODO gates

        emitter.on('vote', online(this._handleVote));
        emitter.on('flag', online(this._handleFlag));
        emitter.on('transfer', online(this._handleTransfer));
        emitter.on('reply', online(this._handleReply));

        emitter.on('blockDone', this._broadcast.bind(this));
    }

    async stop() {
        // TODO -
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
        this._accumulator[user] = this._accumulator[user] || {};
        this._accumulator[user][type] = this._accumulator[user][type] || [];

        return this._accumulator[user][type];
    }

    _cleanAccumulator() {
        this._accumulator = {};
    }

    _broadcast() {
        // TODO -
    }
}

module.exports = Notifier;
