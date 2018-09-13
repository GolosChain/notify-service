const core = require('gls-core-service');
const stats = core.Stats.client;
const BasicMain = core.services.BasicMain;
const MongoDB = core.service.MongoDB;
const env = require('./env');
const Registrator = require('./services/Registrator');
const Notifier = require('./services/Notifier');
const Cleaner = require('./services/Cleaner');
const Connector = require('./services/Connector');

class Main extends BasicMain {
    constructor() {
        super(stats);

        const mongo = new MongoDB();
        const registrator = new Registrator();
        const connector = new Connector();
        const notifier = new Notifier(registrator, connector);
        const cleaner = new Cleaner();

        this.printEnvBasedConfig(env);
        this.addNested(mongo, registrator, notifier, connector, cleaner);
    }
}

module.exports = Main;
