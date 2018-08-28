const Abstract = require('./Abstract');
const Event = require('../../model/Event');

class Reward extends Abstract {
    static async handle(data, blockNum) {
        // TODO wait blockchain implementation
    }
}

module.exports = Reward;
