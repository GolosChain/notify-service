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
        unread: {
            type: Boolean,
            default: true,
        },

        /* Type-specified fields */

        post: {
            // 3 parts which can identify any post/comment
            contentId: {
                userId: { type: String },
                permlink: { type: String },
            },
            title: String,
        },

        comment: {
            contentId: {
                userId: { type: String },
                permlink: { type: String },
            },
            body: String,
        },
        community: {
            // TODO: wait for blockchain
            id: { type: String, default: 'gls' },
            name: {
                type: String,
                default: 'Golos',
            },
        },
        actor: {
            userId: { type: String },
            username: { type: String },
            avatarUrl: { type: String },
        },
        parentComment: {
            contentId: {
                userId: { type: String },
                permlink: { type: String },
            },
            body: String,
        },

        value: {
            amount: { type: String },
            currency: { type: String },
        },
        payout: {
            amount: { type: String },
            currency: { type: String },
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
