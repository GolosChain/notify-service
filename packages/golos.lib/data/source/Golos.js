import BaseDataSource from './base';
import PersistentWebSocket from '../transport/WebSocket/Persistent';
import { Observable } from 'rxjs';
import {EventEmitter} from 'events';

// final
export default class Golos extends EventEmitter {
  // a persistent websocket instance implementing WebSocket interface
  socket = new PersistentWebSocket('wss://ws.golos.io');
  // namespace the streams we produce for consumers
  get stream() {
    const {
      opens,
      messages,
      blocks,
      trx,
      ops
    } = this;
    return {
      opens,
      messages,
      blocks,
      trx,
      ops
    };
  }
  // the sequence of socket openings
  get opens() {
    return Observable.fromEvent(this.socket, 'open');
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
  // the sequence of the applied block numbers (result of set_block_applied_callback)
  get blocks() {
    return this.messages
      .filter(data => (data.method === 'notice' && data.params))
      .map(blockData => blockData.params[1][0])
      .map(blockData => ({
        // calculate and add the current block's number (chain head) for convenience
        index: parseInt(blockData.previous.slice(0, 8), 16),
        ...blockData
      }));
  }
  //  the flattened sequence of transactions from all the blocks
  // (concatenated result of get_ops_in_block)
  get trx() {
    return this.messages
      .filter(message => message.id === 2)
      .map(message => message.result)
    // flat stream of all the chain transactions
      .flatMap(trxArray => Observable.from(trxArray));
  }
  //  the flattened sequence of operations from all the blocks
  get ops() {
    return Observable.fromEvent(this, 'operation');
  }

  // streams = {
  //   // the sequence of socket openings
  //   open:
  //     Observable.fromEvent(
  //       this.socket, 'open'
  //     )
  //       .subscribe(
  //         socketEvent => {
  //           // on each socket open set a block application callback immediately
  //           console.log('[Golos] >>> set_block_applied_callback');
  //           this.socket.send(
  //             // golos api
  //             JSON.stringify({
  //               id: 1,
  //               method: 'call',
  //               'params': ['database_api', 'set_block_applied_callback', [0]],
  //             })
  //           );
  //         }
  //       ),
  //   // the sequence of raw socket messages
  //   message:
  //     Observable.fromEvent(
  //       this.socket, 'message'
  //     ),
  //   // the sequence of the applied block numbers (result of set_block_applied_callback)
  //   block:
  //     Observable.fromEvent(
  //       this.socket, 'message'
  //     )
  //       // todo make this an rx operator
  //       .map(dataEvent => JSON.parse(dataEvent.data))
  //       .catch(e => {
  //         console.log('Error parsing raw data!');
  //         return Observable.empty();
  //       })
  //       .filter(data => (data.method === 'notice' && data.params))
  //       .map(blockData => blockData.params[1][0])
  //       .map(blockData => ({
  //       // calculate and add the current block's number (chain head) for convenience
  //         index: parseInt(blockData.previous.slice(0, 8), 16),
  //         ...blockData
  //       }))
  //       .subscribe(
  //         block => {
  //           // console.log(`------------------------------------------------------- [ ${block.index} ]`);
  //           // for each applied block number
  //           //  request transactions
  //           this.socket.send(
  //             // golos api
  //             JSON.stringify({
  //               id: 2,
  //               method: 'call',
  //               params: ['database_api', 'get_ops_in_block', [block.index, 'false']],
  //             })
  //           );
  //
  //         },
  //         error => {
  //
  //         },
  //         complete => {
  //
  //         }
  //       ),
  //   //  the stream of transactions (result of get_ops_in_block)
  //   trx:
  //     Observable.fromEvent(
  //       this.socket, 'message'
  //     )
  //       .map(dataEvent => JSON.parse(dataEvent.data))
  //       .catch(e => {
  //         console.log('Error parsing raw data!');
  //         return Observable.empty();
  //       })
  //       .filter(message => message.id === 2)
  //       .map(message => message.result)
  //       // flat stream of all the chain transactions
  //       .flatMap(trxArray => Observable.from(trxArray))
  //       .subscribe(
  //         transaction => {
  //           // process operations for each transaction
  //           const {op, timestamp} = transaction;
  //           // transform each operation from tuple to object
  //           const operation = {
  //             // provide a timestamp in operation object
  //             timestamp,
  //             type: op[0],
  //             data: op[1]
  //           };
  //           // console.log(transaction);
  //
  //           // emit the 'operation' event on us to make the external
  //           // processing of this fact possible,
  //           // pass operation data over there
  //           this.emit('operation', operation);
  //         },
  //         error => {
  //         },
  //         complete => {
  //
  //         }
  //       ),
  //   //  the stream of operations (result of trx transformation)
  //   op:
  //     Observable.fromEvent(
  //       this, 'operation'
  //     )
  //       .subscribe(
  //         operation => {
  //           // console.log(operation.type);
  //           // console.log(operation);
  //         },
  //         error => {
  //         },
  //         complete => {
  //
  //         }
  //       ),
  //
  // }

  constructor() {
    super();
    // translate all the events for now
    // todo subscribe to only events from constructor params
    // make streams pulse ...
    const {
      stream: {
        opens,
        blocks,
        trx,
        ops
      }} = this;
    // on each socket open ...
    opens.subscribe(
      socketEvent => {
        // ...set a block application callback immediately
        console.log('[Golos] >>> set_block_applied_callback');
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
    // on each generated block ...
    blocks.subscribe(
      block => {
        console.log(`------------------------------------------------------- [ ${block.index} ]`);
        // ... request transactions for passed block,
        this.socket.send(
          // golos api
          JSON.stringify({
            id: 2,
            method: 'call',
            params: ['database_api', 'get_ops_in_block', [block.index, 'false']],
          })
        );

      },
      error => {

      },
      complete => {
      }
    );
    // on each transaction of each block ...
    trx.subscribe(
      transaction => {
        // ...process operations for the transaction
        const {op, timestamp} = transaction;
        // transform each operation from tuple to object
        const operation = {
          // provide a timestamp in operation object
          timestamp,
          type: op[0],
          data: op[1]
        };
        // emit the 'operation' event on us to make the external
        // processing of this fact possible,
        // pass operation data over there
        this.emit('operation', operation);
      },
      error => {

      },
      complete => {
      }
    );

    ops.subscribe(
      operation => {
        console.log(operation.type);
        // console.log(operation);
      },
      error => {
      },
      complete => {

      }
    );


  }


}
