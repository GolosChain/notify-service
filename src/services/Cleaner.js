const core = require('cyberway-core-service');
const Logger = core.utils.Logger;
const metrics = core.utils.metrics;
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

        const end = metrics.startTimer('cleaning');
        const expiration = Moments.ago(parseInt(env.GLS_EVENT_EXPIRATION));

        try {
            await Event.remove({ timestamp: { $lte: expiration } });

            end();
            Logger.info('Cleaning done!');
        } catch (error) {
            metrics.inc('cleaning_error');
            Logger.error(`Cleaning error - ${error}`);
            process.exit(1);
        }
    }
}

module.exports = Cleaner;
