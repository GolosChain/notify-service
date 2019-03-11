const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;
const eventTypes = require('../data/eventTypes');

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
            enum: eventTypes,
        },
        fresh: {
            type: Boolean,
            default: true,
        },

        /* Type-specified fields */

        post: {
            contentId: {
                userId: String,
                refBlockNum: Number,
                permlink: String,
            },
            title: String,
        },

        comment: {
            contentId: {
                userId: String,
                refBlockNum: Number,
                permlink: String,
            },
            body: String,
        },
        community: {
            id: String,
            name: String,
        },
        actor: {
            id: String,
            name: String,
            avatarUrl: String,
        },
        parentComment: {
            contentId: {
                userId: String,
                refBlockNum: Number,
                permlink: String,
            },
            body: String,
        },

        value: {
            amount: String,
            currency: String,
        },
        payout: {
            amount: String,
            currency: String,
        },

        // upvote | downvote | reply | mention | repost | reward | curator reward
        refBlockNum: {
            type: Number,
        },
        /*  // upvote | downvote | reply | mention | repost | reward | curatorReward
        permlink: {
            type: String,
        },
        // reply | mention
        parentPermlink: {
            type: String,
        },
        // upvote | downvote | transfer | reply | subscribe | unsubscribe
        // mention | repost | message | witnessVote | witnessCancelVote
        fromUsers: {
            type: [String],
        },
        // transfer
        amount: {
            type: String,
        },
        // reward
        reward: {
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
        // curatorReward
        curatorReward: {
            type: String,
        },
        // curatorReward
        curatorTargetAuthor: {
            type: String,
        }, */
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
                    _id: -1,
                },
            },
            // Cleaner
            {
                fields: {
                    createdAt: -1,
                },
            },
            // Restorer
            {
                fields: {
                    blockNum: -1,
                },
            },
            // Edit comment filtration
            {
                eventTypes: 1,
                permlink: 1,
                fromUsers: 1,
            },
        ],
        schema: {
            timestamps: {
                createdAt: 'timestamp',
                updatedAt: 'timestamp',
            },
        },
    }
);
