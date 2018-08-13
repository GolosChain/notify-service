const core = require('gls-core-service');
const MongoDB = core.service.MongoDB;

module.exports = MongoDB.makeModel(
    'Event',
    {
        blockNum: {
            type: Number,
            required: true,
        },
        user: {
            type: String,
            required: true,
        },
        eventType: {
            type: String,
            required: true,
            enum: [
                'vote',
                'flag',
                'transfer',
                'reply',
                'subscribe',
                'unsubscribe',
                'mention',
                'repost',
                'award',
                'curatorAward',
                'message',
                'witnessVote',
                'witnessCancelVote',
            ],
        },
        fresh: {
            type: Boolean,
            default: true,
        },
        // not used for transfer
        counter: {
            type: Number,
            default: 1,
        },

        /* Type-specified fields */

        // vote | flag | reply | mention | repost | award | curatorAward
        permlink: {
            type: String,
        },
        // reply | mention
        parentPermlink: {
            type: String,
        },
        // vote | flag | transfer | reply | subscribe | unsubscribe
        // mention | repost | message | witnessVote | witnessCancelVote
        fromUsers: {
            type: [String],
        },
        // transfer
        amount: {
            type: String,
        },
        // award | curatorAward
        award: {
            golos: {
                type: Number,
            },
            golosPower: {
                type: Number,
            },
            gbg: {
                type: Number,
            },
        },
    },
    {
        index: [
            // Registrator
            {
                fields: {
                    eventType: 1,
                    user: 1,
                },
            },
            // History request
            {
                fields: {
                    user: 1,
                    eventType: 1,
                    updatedAt: -1,
                },
            },
            // Cleaner
            {
                fields: {
                    date: -1,
                },
            },
            // Restorer
            {
                fields: {
                    blockNum: -1,
                },
            },
        ],
    }
);
