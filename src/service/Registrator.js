// TODO -

class Registrator extends BasicService {
    constructor() {
        super();

        this._syncedBlockNum = 0;
        this._syncStack = [];
    }

    async start() {
        await this.restore();

        const subscribe = new BlockSubscribe();

        this.addNested(subscribe);

        await subscribe.start(data => {
            this._trySync(data);
            this._handleBlock(data);
        });
    }

    async stop() {
        await this.stopNested();
    }

    async restore() {
        // TODO -
    }

    _trySync(data) {
        // TODO -
    }

    _handleBlock(data) {
        // TODO -
    }
}

module.exports = Registrator;
