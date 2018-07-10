const core = require('griboyedov');
const MongoDB = core.service.MongoDB;

module.exports = MongoDB.makeModel(
    'Event',
    {
        date: {
            type: Date,
            default: Date.now,
        },
        blockNum: {
            type: Number,
            required: true,
        },
        user: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        fresh: {
            type: Boolean,
            default: true,
        },
        counter: {
            type: Number,
            default: 1,
        },
        // TODO type-specified fields for accumulation
        // TODO -
    },
    {
        index: [
            // Fresh count
            {
                fields: {
                    user: 1,
                    fresh: 1,
                },
            },
            // History request
            {
                fields: {
                    user: 1,
                    type: 1,
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
