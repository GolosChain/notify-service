const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'User',
    {
        name: {
            type: String,
            required: true,
        },
        app: {
            type: String,
            enum: ['gls', 'cyber'],
            default: 'cyber',
        },
        blackList: {
            type: Array,
        },
    },
    {
        index: [
            {
                fields: {
                    user: 1,
                    app: 1,
                },
            },
        ],
    }
);
