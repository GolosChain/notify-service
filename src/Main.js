const core = require('gls-core-service');
const logger = core.Logger;
const stats = core.Stats.client;
const BasicService = core.service.Basic;
const MongoDB = core.service.MongoDB;
const env = require('./Env');
const Registrator = require('./service/Registrator');
const Notifier = require('./service/Notifier');
const Cleaner = require('./service/Cleaner');

class Main extends BasicService {
    constructor() {
        super();

        const mongo = new MongoDB();
        const registrator = new Registrator();
        const notifier = new Notifier(registrator);
        const cleaner = new Cleaner();

        this.printEnvBasedConfig(env);
        this.addNested(mongo, registrator, notifier, cleaner);
        this.stopOnExit();
    }

    async start() {
        await this.startNested();
        stats.increment('main_service_start');
    }

    async stop() {
        await this.stopNested();
        stats.increment('main_service_stop');
        process.exit(0);
    }
}

new Main().start().then(
    () => {
        logger.info('Main service started!');
    },
    error => {
        logger.error(`Main service failed - ${error}`);
        process.exit(1);
    }
);
