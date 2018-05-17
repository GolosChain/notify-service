/* eslint-disable quotes */
import {EventEmitter} from 'events';
import Queue from 'queue/TarantoolQueue';
import PersistentWebSocket from 'transport/WebSocket/Persistent';
import Block from 'chain/golos/entity/GolosBlock';
import onBlockApplied from 'chain/golos/handlers/onGolosBlockApplied';
//
export default class GolosChainProxy extends EventEmitter {
  // the place where consequent block sequence happens
  putHead = async block => {
    const {index} = block;
    // first insert into queue
    const inserted = parseInt((await this.queue.put({
      tube_name: `chain`,
      task_data: index
    }))[2]);
    // then emit
    // this.emit('block', block);
    return inserted;
  }
  //
  getHead = async() => {
    // todo refactor this to take()
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
  onSocketMessage = async event => {
    try {
      const data = JSON.parse(event.data);
      // console.log(data);
      const {id, result: blockData} = data;
      // block applied on chain
      const aBlock = (id === 1 && blockData);
      if (aBlock) {
        // const block = await Block.compose(result);
        // transform raw block data into service Block object
        const block = new Block(blockData);
        // console.log('//////////// ', block.index)
        // keep current chain head each time
        this.hChain = block.index;
        // last saved local head
        const hLocal = await this.getHead() || this.hChain;
        const delta = this.hChain - hLocal;
        //
        if (delta > 1) {
          if (!this.isSynching) {
            this.isSynching = true;
            let current = hLocal + 1;
            while (true) {
              // console.log(`| ++++++++++++++++++++++++++++++++++++++++++  ${current}`);
              const block = new Block(current);
              await block.compose();
              const next = await this.putHead(block) + 1;
              // console.log(`| ++++++++++++++++++++++++++++++++++++++++++  ${current} (trxs: ${block.transactions.length}, ops: ${block.operations.length}) >> ${this.hChain}`);
              // console.log(`*`);
              current = next;
              this.emit('block', block);
              if (current > this.hChain) {
                break;
              }
            }
            this.isSynching = false;
          }
        } else {
          if (!this.isSynching) {
            // wait for middleware
            // console.log(`|-------------------------------------------  ${block.index}`);
            await block.compose();
            const processed = await this.putHead(block);
            // console.log(`|-------------------------------------------  ${processed} (trxs: ${block.transactions.length}, ops: ${block.operations.length})`);
            // console.log(`*`);
            this.emit('block', block);
          }

        }
      }
    } catch (e) { /* do nothing - go to the next message */
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
    //  register default handler for an applied block
    this.on('block', onBlockApplied);
  }
  //
  constructor({
    rpcIn = `ws://127.0.0.1:8091`,
    rpcOut = {host: 'localhost', port: 3301}
  } = {}) {
    super();
    console.log('[x] sniffer initialization ...');
    const {API_GOLOS_URL} = process.env;
    // env should override parameter
    this.rpcIn = API_GOLOS_URL || rpcIn;
    this.rpcOut = rpcOut;
    const {rpcOut: {host, port}} = this;
    this.queue = new Queue({host, port});
    this.queue.on('connect', this.onQueueConnect);
  }
}
