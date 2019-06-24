const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class DeleteComment extends Abstract {
    async handleEvent({ permlink }) {
        // TODO - change to remove with content ID
        await Event.remove({ permlink });
    }
}

module.exports = DeleteComment;
