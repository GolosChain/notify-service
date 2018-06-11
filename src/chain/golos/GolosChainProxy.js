/* eslint-disable quotes */
import {EventEmitter} from 'events';
import Queue from 'queue/TarantoolQueue';
import PersistentWebSocket from 'transport/WebSocket/Persistent';
import Block from 'chain/golos/entity/GolosBlock';
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
        // transform raw block data into service Block object
        const block = new Block(blockData);
        // keep current chain head each time
        this.hChain = block.index;
        // last saved local head
        const hLocal = await this.getHead() || this.hChain;
        const delta = this.hChain - hLocal;
        console.log(`| xxxxxxxxxxxxxxxxxxxxx ${block.index}`);
        //
        if (delta > 1) {
          console.log(`[delta] >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ${delta}`);
          this.socket.removeListener('message', this.onSocketMessage);
          let current = hLocal + 1;
          while (true) {
            const block = new Block(current);
            console.log(`| ~~~~~~~~~~~~~~~~~~~~~ ${block.index}`);
            const before = Date.now();
            // 1
            await block.compose();
            const next = await this.putHead(block) + 1;
            current = next;
            // 2
            this.emit('block', block);
            const after = Date.now();
            const td = (after - before) / 1000;
            console.log(`| ~~~~~~~~~~~~~~~~~~~~~ ${block.index} : ${td} sec.`);
            if (current > this.hChain) {
              this.socket.addListener('message', this.onSocketMessage);
              break;
            }
          }
        } else {
          this.socket.removeListener('message', this.onSocketMessage);
          const before = Date.now();
          // 1
          await block.compose();
          const processed = await this.putHead(block);
          // 2
          this.emit('block', block);
          const after = Date.now();
          const td = (after - before) / 1000;
          console.log(`| xxxxxxxxxxxxxxxxxxxxx ${block.index} : ${td} sec.`);
          this.socket.addListener('message', this.onSocketMessage);
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
    console.log(`[xxxxxxxx] queue connected on [${host}:${port}]`);
    console.log(`[xxxxxxxx] asserting tube named 'chain'`);
    const exists = await this.queue.assertTube('chain');
    console.log(`[x] ${exists}`);
    // start listening to the chain pulse
    console.log(`[x] initializing golosD connection ...`);
    const {API_GOLOS_URL} = process.env;
    this.socket = new PersistentWebSocket(API_GOLOS_URL);
    this.socket.addListener('open', this.onSocketOpen);
    this.socket.addListener('message', this.onSocketMessage);
  }




  //
  constructor(

  //   {
  //   rpcIn = `ws://127.0.0.1:8091`,
  //   rpcOut = {host: 'localhost', port: 3301}
  // } = {}
  ) {
    super();
    console.log('[x] chain proxy initialization ...');
    const {API_QUEUE_HOST} = process.env;
    //
    console.log('API_QUEUE_HOST : ', API_QUEUE_HOST);
    //
    this.queue = new Queue({host: API_QUEUE_HOST, port: 3301});
    this.queue.on('connect', this.onQueueConnect);
  }
}
