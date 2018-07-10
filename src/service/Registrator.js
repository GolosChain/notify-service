const Event = require('../model/Event');
const core = require('griboyedov');
const logger = core.Logger;
const stats = core.Stats.client;
const BasicService = core.service.Basic;

class Registrator extends BasicService {
    async start() {
        await this.restore();

        const subscribe = new BlockSubscribe();

        this.addNested(subscribe);

        await subscribe.start(data => {
            this._restorer.trySync(data);
            this._handleBlock(data);
        });
    }

    async stop() {
        await this.stopNested();
    }

    async restore() {
        const blockHandler = this._handleBlock.bind(this);
        const blockErrorHandler = this._handleBlockError.bind(this);

        this._restorer = new BlockSubscribeRestore(
            Event,
            blockHandler,
            blockErrorHandler
        );

        this.addNested(this._restorer);

        this._restorer.start();
    }

    _handleBlock(data) {
        // TODO -
    }

    _handleBlockError(error) {
        stats.increment('block_registration_error');
        logger.error(`Load block error - ${error}`);
        process.exit(1);
    }
}

module.exports = Registrator;
