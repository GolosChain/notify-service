const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const env = require('../data/env');
const History = require('../controllers/connector/History');
const BlackList = require('../controllers/connector/BlackList');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._history = new History();
        this._blackList = new BlackList();
    }

    async start() {
        const history = this._history;
        const blackList = this._blackList;

        await super.start({
            serverRoutes: {
                history: history.getHistory.bind(history),
                historyFresh: history.getHistoryFresh.bind(history),
                markAsViewed: history.markAsViewed.bind(history),
                markAllAsViewed: history.markAllAsViewed.bind(history),
                markAsRead: history.markAsRead.bind(history),
                markAllAsRead: history.markAllAsRead.bind(history),
                getBlackList: blackList.get.bind(blackList),
                addToBlackList: blackList.add.bind(blackList),
                removeFromBlackList: blackList.remove.bind(blackList),
            },
            requiredClients: {
                onlineNotify: env.GLS_ONLINE_NOTIFY_CONNECT,
                push: env.GLS_PUSH_CONNECT,
                prism: env.GLS_PRISM_CONNECT,
            },
        });
    }
}

module.exports = Connector;
