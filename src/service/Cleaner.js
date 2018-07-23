const core = require('gls-core-service');
const logger = core.Logger;
const stats = core.Stats.client;
const Moments = core.Moments;
const BasicService = core.service.Basic;
const env = require('../Env');
const Event = require('../model/Event');

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
        logger.info('Start cleaning...');

        const timer = new Date();
        const expiration = Moments.ago(env.GLS_EVENT_EXPIRATION);

        try {
            await Event.remove({ createdAt: { $lte: expiration } });

            stats.timing('cleaning', new Date() - timer);
            logger.info('Cleaning done!');
        } catch (error) {
            stats.increment('cleaning_error');
            logger.error(`Cleaning error - ${error}`);
            process.exit(1);
        }
    }
}

module.exports = Cleaner;
