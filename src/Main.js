const core = require('griboyedov');
const logger = core.Logger;
const stats = core.Stats.client;
const BasicService = core.service.Basic;
const Registrator = require('./service/Registrator');
const Notify = require('./service/Notify');
const Push = require('./service/Push');
const Cleaner = require('./service/Cleaner');

class Main extends BasicService {
    constructor() {
        super();

        const registratorService = new Registrator();

        this.addNested(
            new MongoDB(),
            registratorService,
            new Notify(registratorService),
            new Push(),
            new Cleaner()
        );
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
