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

  async exec(luaCode) {
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
    const res = await this.exec(`${namespace}.${command}`);
    // res = JSON.parse(res)
    return res instanceof Array;
  }

  async statistics(name) {
    const {namespace} = this;
    const command = name ? `statistics('${name}')` : `statistics()`;
    const res = await this.exec(`return ${namespace}.${command}`);
    return res;
  }

  async put(tube_name, task_data) {
    // queue.tube.tube_name:put(task_data [, {options} ])
    // The tube_name must be the name which was specified by queue.create_tube.
    // The task_data contents are the user-defined description of the task, usually a long string.
    // Returns: the value of the new tuple in the queue's associated space, also called the "created task".
    // example: queue.tube.list_of_sites:put('Your task is to do something', {pri=2})
    const {namespace} = this;
    // compose the command to run on tarantool
    const command = `tube.${tube_name}:put('${task_data}')`;
    // run it and get response
    const res = await this.exec(`return ${namespace}.${command}`);
    // // res = JSON.parse(res)
    return res[0];
  }

  async take(tube_name, timeout) {
    // Lua:     queue.tube.<tube_name>:take([timeout])
    // Example: t_value = queue.tube.list_of_sites:take(15)
    // Action:  searches for a task in the queue or sub-queue (that is, a tuple in the queue's associated space)
    //          which has task_state = 'r' (ready), and task_id = a value lower than any other tuple which also
    //          has task_state = 'r'.
    // Effect:  the value of task_state changes to 't' (taken). The take request tells the system that the task is being
    //          worked on. It should be followed by an ack request when the work is finished. Additional effect:
    //          a tuple is added to the _queue_taken space.
    // Returns: the value of the taken tuple, or nil if none was found. The value of the first field in the tuple
    //          (task_id) is important for further requests. The value of the second field in the tuple (task_data) is
    //          important as it presumably contains user-defined instructions for what to do with the task.
    const {namespace} = this;
    // compose the command to run on tarantool
    const command = `tube.${tube_name}:${timeout ? `take(${timeout})` : `take()`}`;
    // console.log(`return ${namespace}.${command}`);
    // run it and get response
    const res = await this.exec(`return ${namespace}.${command}`);
    // // res = JSON.parse(res)
    return res[0];
  }

  async ack(tube_name, task_id) {
    // Lua:     queue.tube.<tube_name>:ack(task_id)
    // Example: queue.tube.list_of_sites:ack(15)
    // Action:  The worker which has used 'take' to take the task should use 'ack' to signal that the task has
    //          been completed. The current task_state of the tuple should be 't' (taken), and the worker issuing
    //          the ack request must have the same ID as the worker which issued the take request.
    // Effect:  the value of task_state changes to '-' (acknowledged). Shortly after this, it may be removed from
    //          the queue automatically.
    //          If 'take' occurs but is not soon followed by 'ack' -- that is, if ttr (time to run) expires, or if the
    //          worker disconnects -- the effect is: task_state is changed from 't' (taken) back to 'r' (ready).
    //          This effect is the same as what would happen with a release request.
    // Returns: the value of the taken tuple, or nil if none was found. The value of the first field in the tuple
    //          (task_id) is important for further requests. The value of the second field in the tuple (task_data) is
    //          important as it presumably contains user-defined instructions for what to do with the task.
    const {namespace} = this;
    // compose the command to run on tarantool
    const command = `tube.${tube_name}:ack(${task_id})`;
    // console.log(`return ${namespace}.${command}`);
    // run it and get response
    const res = await this.exec(`return ${namespace}.${command}`);
    // // res = JSON.parse(res)
    return res[0];
  }


  close() {
    this.tnt.disconnect();
  }

}
