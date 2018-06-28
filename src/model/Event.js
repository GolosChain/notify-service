// TODO -

module.exports = MongoDB.makeModel(
    'Event',
    {
        date: {
            type: Date,
            default: Date.now,
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
            [
                {
                    user: 1,
                    fresh: 1,
                },
            ],
            // History request
            [
                {
                    user: 1,
                    type: 1,
                },
            ],
        ],
    }
);
