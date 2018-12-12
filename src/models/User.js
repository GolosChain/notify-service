const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'User',
    {
        name: {
            type: String,
            required: true,
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
                },
            },
        ],
    }
);
