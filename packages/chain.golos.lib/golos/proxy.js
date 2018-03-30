/* eslint-disable quotes */
//
// this will always keep generated block application events in a strict sequence despite of message gaps
// to let the consumers do their job on each block sequentally
// we use a persistent FIFO queue since any service can immediately die
// the 'chain' tube is the only source of truth for further processing
// and should be used as an infinite iterable
// the only(!) producer for the 'chain' tube is this instance
//
import {EventEmitter} from 'events';
import Queues from 'queue.golos.lib';
import PersistentWebSocket from '../transport/WebSocket/Persistent';
//
const {Tarantool: Queue} = Queues;
//
export default class Golos extends EventEmitter {
  //
  put = async(value, block) => {
    // we must successfully put into 2 queues
    // block <--> ops
    //
    const blockStr = JSON.stringify(block);
    console.log(blockStr);

    const inserted = parseInt((await this.queue.put({
      tube_name: `block`,
      task_data: value
    }))[2]);
    return inserted;
  }
  //
  get = async() => {
    // get the queue's tail
    const q_height = parseInt((await this.queue.statistics('block'))
      .tasks
      .total
    );
    // the index of the most recent record
    const q_top_index = q_height - 1;
    const h = parseInt((await this.queue.peek('block', q_top_index))[2]);
    return h;
  }
  //
  requestOps = block => {
    this.socket.send(
      JSON.stringify({
        id: 2,
        jsonrpc: '2.0',
        method: 'call',
        params: ['database_api', 'get_ops_in_block', [block, 'false']],
      }));
  }
  //
  process = async({hRemote, hLocal, block}) => {
    // console.log(block);
    this.hRemote = hRemote;
    // each chain tick
    // compare remote and local heads
    const delta = hRemote - hLocal;
    //
    if (delta > 1) {
      if (!this.gap) {
        //  gap detected
        this.gap = true;
        let current = hLocal + 1;
        // close the gap
        while (true) {
          console.log(`|~~~~~~~ `, current);
          const block = {
            // no more rpc requests
            // let consumers do that
            action: `requestOps`
          };
          current = await this.put(current, block) + 1;
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
    const hNew = await this.put(hRemote, block);
    console.log(`|----------------------- `, hNew);
  }
  //
  getInitialBlockInfo = data => {
    const {transactions} = data;
    const operations = transactions
      .map(trx => trx.operations)
      .map(ops => ops[0])
      .map(opTuple => {
        const [type, payload] = opTuple;
        return {
          type, payload
        };
      });
    // before mapping:
    // [ [ [ 'vote', [Object] ] ],
    // [ [ 'vote', [Object] ] ],
    // [ [ 'vote', [Object] ] ] ]
    //
    // only 1 operation per transaction for now
    // todo can be more?
    return {operations};
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
        const preblock = this.getInitialBlockInfo(result);
        // console.log(preblock.operations);
        // keep current applied block
        const hRemote = parseInt(previous.slice(0, 8), 16) + 1;
        const hLocal = await this.get();
        const block = {
          index: hRemote,
          ...preblock
        };
        // now block looks as such:
        // { index: 15153265,
        //   operations:
        //   [ { type: 'pow2', payload: [Object] },
        //     { type: 'vote', payload: [Object] },
        //     { type: 'vote', payload: [Object] } ] }
        //
        //  process it
        this.process({
          hRemote,
          hLocal,
          block
        });
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
    console.log(`[x] asserting tube named 'block'`);
    let exists = await this.queue.assertTube('block');
    console.log(`[x] ${exists}`);
    console.log(`[x] asserting tube named 'ops'`);
    exists = await this.queue.assertTube('ops');
    // [block]--[[ops]]
    // [546..]--[[...]]
    console.log(`[x] ${exists}`);
    // start listening to chain pulse
    console.log(`[x] initializing golosD connection ...`);
    this.socket = new PersistentWebSocket(``);
    this.socket.on('open', this.onSocketOpen);
    this.socket.on('message', this.onSocketMessage);
  }
  //
  constructor() {
    super();
    console.log('[x] sniffer initialization ...');
    this.queue = new Queue({port: 3301});
    this.queue.on('connect', this.onQueueConnect);
  }
}