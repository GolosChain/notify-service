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
        eventType: {
            type: String,
            required: true,
            enum: eventTypes,
        },
        fresh: {
            type: Boolean,
            default: true,
        },
        unread: {
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
        refBlockNum: {
            type: Number,
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
