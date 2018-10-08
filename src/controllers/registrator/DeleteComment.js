const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class DeleteComment extends Abstract {
    async handle({ permlink }) {
        await Event.remove({ permlink });
    }
}

module.exports = DeleteComment;
