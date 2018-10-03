const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const env = require('../env');
const History = require('../controllers/connector/History');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._history = new History();
    }

    async start() {
        const history = this._history;

        await super.start({
            serverRoutes: {
                history: history.getHistory.bind(history),
                historyFresh: history.getHistoryFresh.bind(history),
                markAsViewed: history.markAsViewed.bind(history),
                markAllAsViewed: history.markAllAsViewed.bind(history),
            },
            requiredClients: {
                onlineNotify: env.GLS_ONLINE_NOTIFY_CONNECT,
                push: env.GLS_PUSH_CONNECT,
            },
        });
    }
}

module.exports = Connector;
