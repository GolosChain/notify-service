const core = require('griboyedov');
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
        const eventsCursor = await this._aggregateData();

        eventsCursor.on('data', document => {
            document.remove();
        });

        eventsCursor.on('close', () => {
            logger.info('Cleaning done!');
            stats.timing('cleaning', new Date() - timer);
        });

        eventsCursor.on('error', error => {
            stats.increment('cleaning_error');
            logger.error(`Cleaning error - ${error}`);
            process.exit(1);
        });
    }

    async _aggregateData() {
        const expiration = Moments.ago(env.EVENT_EXPIRATION);

        return await Event.where('date')
            .lte(expiration)
            .cursor();
    }
}

module.exports = Cleaner;
