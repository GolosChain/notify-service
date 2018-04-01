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
  // the place where clear block sequence happens
  //
  put = async(value, block) => {
    // todo duplication of value and block which has index - refactor
    const putBlockData = async block => {
      // insert('test', [999, 999, 'fear'])
      // console.log(block);
      const blockNum = parseInt(block.index);
      const dataStr = JSON.stringify(block);
      // console.log(`-----------------------`);
      // console.log(blockNum);
      const {driver: store} = this.queue;
      const res = await store.insert('block_data', [
        blockNum,
        dataStr
      ]);
      // console.log(`%%%%%%%%%%%%%%%%%%%%% `, res);
    };
    // we should have saved block operations when it comes from block_applied_callback
    // (from chain version 17 only)
    // to reduce the number of further api requests
    // if we have no operations data (gap closing mode)
    // pass the request to fetch operations for block
    // in $action field of the composed block object
    // further cunsomers have an ability to complete the block using the field
    // or may be $complete field - thinking ...
    // console.log(block);
    // first push into queue (important)
    // this makes consumers connected to queue know about a new block
    const inserted = parseInt((await this.queue.put({
      tube_name: `chain`,
      task_data: value
    }))[2]);
    // todo get rid of undefined block value
    if (block) {
      const {operations} = block;
      // for (const op of operations) {
      //   console.log(op.type);
      // }
    } else {
      block = {
        index: value
      };
    }
    console.log(block);
    // let event subscribers know about a new block
    this.emit('block', block);
    // then! cache block data
    try {
      if (block) {
        await putBlockData(block);
      }
    } catch (e) {
      console.log(`[xxxxxxxxxxxxx] error caching data for ${block.index}`, e);
    }
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
            index: current,
            // no more rpc requests
            // let consumers do that
            action: `requestOps`
          };
          // now pass undefined as block for this case
          // to save nothing into corresponding space
          current = await this.put(current/*, block*/) + 1;
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
  getInitialBlockInfo = (data, blocknum) => {
    const {transactions} = data;
    const operations = transactions
      .map(trx => trx.operations)
      .map(ops => ops[0])
      .map(opTuple => {
        const [type, payload] = opTuple;
        // the final shape of each op
        return {
          block: blocknum,
          type,
          payload
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
        // keep current applied block
        // todo hRemote hLocal should be refactored!
        const hRemote = parseInt(previous.slice(0, 8), 16) + 1;
        const hLocal = await this.get();
        const preblock = this.getInitialBlockInfo(result, hRemote);
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
    console.log(`[x] asserting tube named 'chain'`);
    const exists = await this.queue.assertTube('chain');
    console.log(`[x] ${exists}`);
    // start listening to the chain pulse
    console.log(`[x] initializing golosD connection ...`);
    const {rpcIn} = this;
    this.socket = new PersistentWebSocket(rpcIn);
    this.socket.on('open', this.onSocketOpen);
    this.socket.on('message', this.onSocketMessage);
  }
  //
  constructor({
    rpcIn = `ws://127.0.0.1:8091`,
    rpcOut = { port: 3301}} = {}) {
    super();
    console.log('[x] sniffer initialization ...');
    // this.queue = new Queue({port: 3301});
    this.rpcIn = rpcIn;
    this.rpcOut = rpcOut;
    const {rpcOut: {port}} = this;
    this.queue = new Queue({port});
    this.queue.on('connect', this.onQueueConnect);
  }
}
