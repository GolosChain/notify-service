import { Observable } from 'rxjs';
import {EventEmitter} from 'events';
import PersistentWebSocket from '../transport/WebSocket/Persistent';
import Operation from '../chain/operation';

export default class Golos extends EventEmitter {
  socket; // rpc
  block; // current processing block
  // the sequence of socket openings
  get opens() {
    return Observable
      .fromEvent(this.socket, 'open')
      .do(
        socketEvent => {
          // ...set a block application callback immediately
          console.log('>>>>>> set_block_applied_callback');
          this.socket.send(
            // golos api
            JSON.stringify({
              id: 1,
              method: 'call',
              'params': ['database_api', 'set_block_applied_callback', [0]],
            })
          );
        }
      );
  }
  // the sequence of raw socket messages
  get messages() {
    return Observable
      .fromEvent(this.socket, 'message')
      // todo make this an rx operator
      .map(dataEvent => JSON.parse(dataEvent.data))
      .catch(e => {
        // todo throw something custom here
        console.log('Error parsing raw data!');
        return Observable.empty();
      });
  }
  // the sequence of the applied block structs (result of set_block_applied_callback)
  get pulse() {
    return this.messages
      .filter(data => (data.method === 'notice' && data.params))
      .map(blockData => blockData.params[1][0])
      .map(blockData => ({
        // calculate and add the current block's number (chain head) for convenience
        index: parseInt(blockData.previous.slice(0, 8), 16),
        ...blockData
      }))
      .do(
        block => {
          if (!this.block) {
          // the next block is ready to be composed
          // save the initial state
            this.block = block;
            // request transactions
            this.socket.send(
            // golos api
              JSON.stringify({
                id: 2,
                method: 'call',
                params: ['database_api', 'get_ops_in_block', [block.index, 'false']],
              })
            );
            //  track transactions for this block in transactions stream
          }
        });
    // .do(blockData => console.log(blockData));
  }
  // produce transactions array for current processing block
  get transactions() {
    return this.messages
      .filter(message => message.id === 2)
      // .map(message => Observable.from(message.result));
      .map(message => message.result);

    // .do(transactions => {
    //   // got a requested array of transactions for block this.block
    //   // compose block struct
    //   const block = {
    //     transactions,
    //     ...this.block
    //   };
    //   // block structure is composed - emit
    //   this.emit('block', block);
    //   // allow the next block processing
    //   this.block = null;
    //   //
    //
    //   // // ...process operations for the transaction
    //   // const {op, timestamp} = transaction;
    //   // // transform each operation from tuple to object
    //   // const operation = {
    //   //   // provide a timestamp in operation object
    //   //   timestamp,
    //   //   type: op[0],
    //   //   data: op[1]
    //   // };
    //   // // emit the 'operation' event on us to make the external
    //   // // processing of this fact possible,
    //   // // pass operation data over there
    //   // this.emit('operation', operation);
    //
    //
    // });
  }
  // produce operations array for current processing block
  get operations() {
    return this.transactions
      .map(transactions =>
        transactions.map(
          trx => {
            const {op} = trx;
            const type = op[0];
            const data = op[1];
            return {type, data};
          }
        )
      )
      .do(operations => {
        // got a requested array of transactions for block this.block
        // compose block struct
        const block = {
          operations,
          ...this.block
        };
        // block structure is composed - emit
        this.emit('block', block);
        // allow the next block processing
        this.block = null;
      }
      );
  }
  // produce the sequence of composed blocks
  get blocks() {
    return Observable
      .fromEvent(this, 'block');
  }
  //
  constructor() {
    super();
    // a persistent websocket instance implementing WebSocket interface
    this.socket = new PersistentWebSocket('wss://ws.golos.io');
    // nothing's being processed right now
    this.block = null;
    // make streams live
    this.opens.subscribe();
    this.pulse.subscribe();
    this.operations.subscribe();
    this.transactions.subscribe();
    this.blocks.subscribe(
      block => {
        console.log(`------------------------------------------------------- [ ${block.index} ]`);
        console.log(`[ops count : ] ${block.operations.length}`);
        block.operations.map(op => console.log(op.type));
      }
    );
  }
}
