const core = require('griboyedov');
const Moments = core.Moments;
const Abstract = require('./Abstract');
const Event = require('../../model/Event');

class Award extends Abstract {
    static async handle(data, blockNum) {
        // TODO wait blockchain implementation
    }
}

module.exports = Award;
