const core = require('griboyedov');
const Moments = core.Moments;
const Abstract = require('./Abstract');
const Event = require('../../model/Event');

class CuratorAward extends Abstract {
    static async handle(data, blockNum) {
        // TODO wait blockchain implementation
    }
}

module.exports = CuratorAward;
