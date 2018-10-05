const core = require('gls-core-service');
const Logger = core.utils.Logger;
const stats = core.utils.statsClient;
const Moments = core.utils.Moments;
const BasicService = core.services.Basic;
const env = require('../data/env');
const Event = require('../models/Event');

class Cleaner extends BasicService {
    async start() {
        await this.restore();

        this.startLoop(Moments.remainedToNextDay, Moments.oneDay);
    }

    async stop() {
        this.stopLoop();
    }

    async restore() {
        await this.iteration();
    }

    async iteration() {
        Logger.info('Start cleaning...');

        const timer = new Date();
        const expiration = Moments.ago(env.GLS_EVENT_EXPIRATION);

        try {
            await Event.remove({ createdAt: { $lte: expiration } });

            stats.timing('cleaning', new Date() - timer);
            Logger.info('Cleaning done!');
        } catch (error) {
            stats.increment('cleaning_error');
            Logger.error(`Cleaning error - ${error}`);
            process.exit(1);
        }
    }
}

module.exports = Cleaner;
