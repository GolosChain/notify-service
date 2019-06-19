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
                history: {
                    handler: history.getHistory,
                    scope: history,
                    inherits: ['identification', 'historyByTypes'],
                    validation: {
                        properties: {
                            fromId: {
                                type: ['string', 'null'],
                                default: null,
                            },
                            limit: {
                                type: 'number',
                                default: 10,
                            },
                            markAsViewed: {
                                type: 'boolean',
                                default: true,
                            },
                            freshOnly: {
                                type: 'boolean',
                                default: false,
                            },
                        },
                    },
                },
                historyFresh: {
                    handler: history.getHistoryFresh,
                    scope: history,
                    inherits: ['identification', 'historyByTypes'],
                    validation: {},
                },
                markAsViewed: {
                    handler: history.markAsViewed,
                    scope: history,
                    inherits: ['identification'],
                    validation: {
                        properties: {
                            ids: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                default: [],
                            },
                        },
                    },
                },
                markAllAsViewed: {
                    handler: history.markAllAsViewed,
                    scope: history,
                    inherits: ['identification'],
                    validation: {},
                },
                markAsRead: {
                    handler: history.markAsRead,
                    scope: history,
                    inherits: ['identification'],
                    validation: {
                        properties: {
                            ids: {
                                type: 'array',
                                items: {
                                    type: 'string',
                                },
                                default: [],
                            },
                        },
                    },
                },
                markAllAsRead: {
                    handler: history.markAllAsRead,
                    scope: history,
                    inherits: ['identification'],
                    validation: {},
                },
                getBlackList: {
                    handler: blackList.get,
                    scope: blackList,
                    validation: {
                        required: ['owner'],
                        properties: {
                            owner: {
                                type: 'string',
                            },
                        },
                    },
                },
                addToBlackList: {
                    handler: blackList.add,
                    scope: blackList,
                    validation: {
                        required: ['owner', 'banned'],
                        properties: {
                            owner: {
                                type: 'string',
                            },
                            banned: {
                                type: 'string',
                            },
                        },
                    },
                },
                removeFromBlackList: {
                    handler: blackList.remove,
                    scope: blackList,
                    validation: {
                        required: ['owner', 'banned'],
                        properties: {
                            owner: {
                                type: 'string',
                            },
                            banned: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
            serverDefaults: {
                parents: {
                    identification: {
                        validation: {
                            required: ['app', 'user'],
                            properties: {
                                app: {
                                    type: 'string',
                                    enum: ['cyber', 'gls'],
                                    default: 'cyber',
                                },
                                user: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    historyByTypes: {
                        validation: {
                            properties: {
                                types: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                        enum: [
                                            'all',
                                            'upvote',
                                            'downvote',
                                            'transfer',
                                            'reply',
                                            'subscribe',
                                            'unsubscribe',
                                            'mention',
                                            'repost',
                                            'reward',
                                            'curatorReward',
                                            'witnessVote',
                                            'witnessCancelVote',
                                        ],
                                        default: ['all'],
                                    },
                                },
                            },
                        },
                    },
                },
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
