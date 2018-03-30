/* eslint-disable quotes */
import {EventEmitter} from 'events';
import sniffer from './sniffer';
import Queue from '../../../queue/tarantool/Queue';
import PersistentWebSocket from '../../transport/WebSocket/Persistent';

export default class golosD extends EventEmitter {
  //
  put = async value => {
    const inserted = parseInt((await this.queue.put({
      tube_name: `chain`,
      task_data: value
    }))[2]);
    return inserted;
  }
  //
  get = async() => {
    // get the queue's tail
    const q_height = parseInt((await this.queue.statistics('chain'))
      .tasks
      .total
    );
    // the index of the most recent record
    const q_top_index = q_height - 1;
    const h = parseInt((await this.queue.peek('chain', q_top_index))[2]);
    return h;
  }
  //
  process = async({hRemote, hLocal}) => {
    this.hRemote = hRemote;
    // each chain tick
    // compare remote and local heads
    const delta = hRemote - hLocal;
    // console.log(hRemote, hLocal, delta);
    //
    if (delta > 1) {
      if (!this.gap) {
        //  gap detected
        this.gap = true;
        let current = hLocal + 1;
        // close the gap
        while (true) {
          console.log(`| `, current);
          current = await this.put(current) + 1;
          // if ((this.hRemote - current) === 1) {
          if (this.hRemote < current) {
            this.gap = false;
            break;
          }
        }
      }
      return;
    }
    // push local only if remote's the next
    // or queue's empty (first run)
    const hNew = await this.put(hRemote);
    console.log(`| -------- `, hNew);
  }
  // each socket message
  onSocketMessage = async event => {
    try {
      const data = JSON.parse(event.data);
      const {id, result} = data;
      // block applied on chain
      const aBlock = (id === 1);
      if (aBlock) {
        const {previous} = result;
        // keep current applied block
        const hRemote = parseInt(previous.slice(0, 8), 16) + 1;
        const hLocal = await this.get();
        //  process current situation
        this.process({hRemote, hLocal});
      }
    } catch (e) {
    //  do nothing - go to the next message
    } finally {
    }
  }
  //
  onSocketOpen = event => {
    console.log('[x] requesting block application push ...');
    //
    this.socket.send(JSON
      .stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'call',
        'params': ['database_api', 'set_block_applied_callback', [0]]
      }), e => {
      if (e) return console.warn(e);
    });
    //
  }
  // entry point is here since the queue init is a must
  onQueueConnect = async where => {
    const {host, port} = where;
    console.log(`[x] queue connected on [${host}:${port}]`);
    console.log(`[x] asserting tube named 'chain'`);
    // this will always keep generated block application events
    // in a strict sequence
    // to let the consumers do their job on each block sequentally
    // we need a persistent FIFO queue since any service can immediately die
    // the 'chain' tube is the only source of truth for further processing
    // and should be used as an infinite iterable
    // the only(!) seeder of this tube is a sniffer which totally manages it
    const exists = await this.queue.assertTube('chain');
    console.log(`[x] ${exists}`);
    // start listening to chain pulse
    console.log(`[x] initializing golosD connection ...`);
    this.socket = new PersistentWebSocket(``);
    this.socket.on('open', this.onSocketOpen);
    this.socket.on('message', this.onSocketMessage);


    //  so, init the sniffer here passing him the queue as a store
    //  create get and set to conform the sniffer's store interface
    // const get = async(redkey, callback) => {
    //   // we cannot 'take' as the sniffer is not a consumer and can't change the state of task!
    //   // so, just look at it
    //   let num;
    //   let err;
    //   try {
    //     // tuple
    //     const top = await this.queue.peek('chain');
    //     // get values from tuple
    //     const [id, state, value] = top;
    //     num = parseInt(value);
    //     // const [id, status, data] = num;
    //   } catch (e) {
    //     err = e;
    //   } finally {
    //     if (callback) {
    //       callback(err, Number(num));
    //     }
    //     return Number(num);
    //   }
    // };
    //
    // const set = async(key, value) => {
    //   const res = await this.queue.put({
    //     tube_name: 'chain',
    //     task_data: value
    //   });
    //   return res;
    //   // console.log(`||||||||||||||||||||||||||`, res);
    // };
    //
    // const client = {
    //   get,
    //   set
    // };


    // store.get('bla', (err, num) => {
    //   console.log(`<<<<<<<<<`);
    //   console.log('err : ', err);
    //   console.log('num : ', num);
    // });
    //
    // store.set('bla', 700);


  }
  //
  constructor() {
    super();
    console.log('[x] sniffer initialization ...');
    this.queue = new Queue({port: 3301});
    this.queue.on('connect', this.onQueueConnect);
  }
}
