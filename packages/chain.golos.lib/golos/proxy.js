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
  // the place where consequent block sequence happens
  put = async block => {
    // todo duplication of value and block which has index - refactor
    // const putBlockData = async block => {
    //   // insert('test', [999, 999, 'fear'])
    //   // console.log(block);
    //   const blockNum = parseInt(block.index);
    //   const dataStr = JSON.stringify(block);
    //   // console.log(`-----------------------`);
    //   // console.log(blockNum);
    //   const {driver: store} = this.queue;
    //   const res = await store.insert('block_data', [
    //     blockNum,
    //     dataStr
    //   ]);
    //   // console.log(`%%%%%%%%%%%%%%%%%%%%% `, res);
    // };
    const {index} = block;
    // first insert into queue
    const inserted = parseInt((await this.queue.put({
      tube_name: `chain`,
      task_data: index
    }))[2]);
    // then emit
    this.emit('block', block);
    // // then! cache block data
    // try {
    //   if (block) {
    //     await putBlockData(block);
    //   }
    // } catch (e) {
    //   console.log(`[xxxxxxxxxxxxx] error caching data for ${block.index}`, e);
    // }
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
  getBlockTransactions = index => {
    //
    this.socket.send(
      JSON.stringify({
        id: index,
        jsonrpc: '2.0',
        method: 'call',
        params: ['database_api', 'get_ops_in_block', [index, 'false']],
      }));
    //
    return new Promise(
      (resolve, reject) => {
        // track get_ops_in_block response
        const listener = event => {
          // got data
          const data = JSON.parse(event.data);
          const {id, result} = data;
          if (id === index) {
            // stop tracking
            this.socket.removeListener('message', listener);
            // resolve
            resolve(result);
          }
        };
        this.socket.addListener('message', listener);
      });
  }
  //
  composeBlock = async(data, blocknum) => {
    // start block construction
    let block = {};
    // fast forward mode
    if (data) {
      // 0.17
      let {
        result: info
      } = data;
      // 0.16
      if (!info) {
        const {params: [, [result]]} = data;
        info = result;
      }
      const {previous} = info;
      const index = parseInt(previous.slice(0, 8), 16) + 1;
      //
      block = {index, ...info};
    } else {
      // fast forward mode - no block data here
      block = {
        index: blocknum
      };
    }
    // check if transactions already exist (0.17)
    let {transactions, index} = block;
    if (!transactions) {
      // transactions is undefined (either fast forward or 0.16)
      // request them
      console.log(`[x] requesting ...`);
      transactions = await this.getBlockTransactions(index);
    }
    //
    const operations = transactions
      .map(trx => {
        const {
          trx_id,
          // 0.16
          op,
          // 0.17
          operations
        } = trx;
        // todo now processes only one op per transaction!
        const opsArray = op || operations;
        let type, payload;
        if (operations) {
          // 0.17
          type = opsArray[0][0];
          payload = opsArray[0][1];
        }
        if (op) {
          // 0.16
          type = opsArray[0];
          payload = opsArray[1];
        }
        // console.log({type, payload});
        return {
          type,
          payload,
          trx_id
        };
      });
    //
    block = {
      index,
      operations
    };
    return block;
  }
  //
  process = async({hRemote, hLocal, block}) => {
    // console.log(`++++++++++++++++++++ process `, block.index);
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
          const block = await this.composeBlock(undefined, current);
          // now pass undefined as block for this case
          // to save nothing into corresponding space
          current = await this.put(block) + 1;
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
    const hNew = await this.put(block);
    console.log(`|----------------------- `, hNew);
  }
  // each socket message
  onSocketMessage = async event => {
    try {
      const data = JSON.parse(event.data);
      // console.log(data);
      const {
        // 0.17
        id,
        result,
        // 0.16
        method
      } = data;
      // block applied on chain
      const aBlock = ((id === 1) && (result) || (method === 'notice'));
      if (aBlock) {
        const block = await this.composeBlock(data);
        // keep current applied block
        // todo hRemote hLocal should be refactored!
        const hRemote = block.index;
        const hLocal = await this.get();
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
