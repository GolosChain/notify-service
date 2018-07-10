const core = require('griboyedov');
const BasicService = core.service.Basic;

class Notifier extends BasicService {
    constructor(userEventEmitter) {
        super();

        this._userEventEmitter = userEventEmitter;
    }

    async start() {
        this._userEventEmitter.on('newUserEvent', event => {
            // TODO -
        });
        // TODO -
    }

    async stop() {
        // TODO -
    }
}

module.exports = Notifier;
