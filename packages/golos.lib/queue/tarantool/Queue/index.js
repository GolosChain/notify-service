/* eslint-disable quotes */
import {EventEmitter} from 'events';
import Tarantool from 'tarantool-driver/lib/connection';
import BadConfigError from './error/BadConfigError';
import Tube from './Tube';

// https://github.com/tarantool/tarantool-python/blob/master/tarantool/utils.py

// good docs : http://tarantool-queue-python.readthedocs.io/en/latest/quick-start.en.html#prepare-server


const ENCODING_DEFAULT = 'utf-8';
const connectionStatus = {
  disconnected: 0,
  connected: 1,
  reconnecting: 2
};


export default class Queue extends EventEmitter {
  constructor({
    host = 'localhost',
    port = 33013,
    user = null,
    password = null,
    namespace = 'box.queue',
    encoding = ENCODING_DEFAULT
  }) {
    // check args
    if (!host || !port) {
      throw new BadConfigError('host and port params must be not empty');
    }
    if (!Number.isInteger(port)) {
      throw new BadConfigError('port must be int');
    }
    super();
    // set initial status
    this.status = connectionStatus.disconnected;
    // init members
    this.host = null; // assigned by 'connect' event
    this.port = null; // assigned by 'connect' event
    this.user = user;
    this.password = password;
    this.namespace = namespace;
    // try to establish connection
    this.tnt = new Tarantool({host, port, user, password});
    // set current status
    this.tnt.on('connect', data => {
      this.emit('connect', data);
      this.status = connectionStatus.connected;
    });
    this.tnt.on('reconnecting', data => {
      this.emit('reconnecting', data);
      this.status = connectionStatus.reconnecting;
    });
  }

  async run(luaCode) {
    const {tnt} = this;
    let result = null;
    try {
      result = await tnt.eval(luaCode);
    } catch (e) {
      console.log('Error running Lua code on Tarantool', e);
    }
    return result;
  }

  async tube(name) {

  }

  async assertTube(name, type = 'fifo') {
    // queue.create_tube(queue name, queue type [, {options} ])
    // queue.create_tube('tube_name', 'fifottl', {temporary = true})
    // get the tarantool queue address
    const {namespace} = this;
    // compose the command to run on tarantool
    const command = `create_tube('${name}', '${type}', {if_not_exists = true})`;
    // run it and get response
    const res = await this.run(`${namespace}.${command}`);
    // res = JSON.parse(res)
    return res instanceof Array;
  }



  close() {
    this.tnt.disconnect();
  }

}
