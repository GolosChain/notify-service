const Abstract = require('./Abstract');
const Event = require('../../models/Event');

class Message extends Abstract {
    async handle(data, blockNum) {
        // TODO wait blockchain implementation
        // TODO filtrate from transactions
    }
}

module.exports = Message;
