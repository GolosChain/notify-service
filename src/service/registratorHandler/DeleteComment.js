const Abstract = require('./Abstract');
const Event = require('../../model/Event');

class DeleteComment extends Abstract {
    static async handle({ permlink }) {
        await Event.remove({ permlink });
    }
}

module.exports = DeleteComment;
