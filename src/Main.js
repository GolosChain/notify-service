const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const env = require('./data/env');
const Registrator = require('./services/Registrator');
const Notifier = require('./services/Notifier');
const Cleaner = require('./services/Cleaner');
const Connector = require('./services/Connector');

class Main extends BasicMain {
    constructor() {
        super(stats);

        const mongo = new MongoDB();
        const connector = new Connector();
        const registrator = new Registrator(connector);
        const notifier = new Notifier(registrator, connector);
        const cleaner = new Cleaner();

        this.printEnvBasedConfig(env);
        this.addNested(mongo, connector, registrator, notifier, cleaner);
    }
}

module.exports = Main;
