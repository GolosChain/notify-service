// import GProxy from './lib/proxy';
// // console.log(require('path').join(__dirname, '..'));
// // require('app-module-path').addPath(require('path').join(__dirname, '..'));
// // // ! all further absolute import paths have the current dir as a root !
// const proxy = new GProxy({
//   source: 'wss://ws.golos.io',
//   target: 'ws://bla.bla'
// });
// //
// proxy.start();

// --------------------------------------------------------------------------------------------------------
// https://stackoverflow.com/questions/38649652/rxjs-catch-error-and-continue
// https://stackoverflow.com/questions/47303096/how-to-get-all-messages-using-method-consume-in-lib-amqp-node
// https://medium.com/@benlesh/learning-observable-by-building-observable-d5da57405d87

// docker run -d --hostname my-rabbit --name some-rabbit -p 8080:15672 -p 5672:5672 rabbitmq:3.7.3-management-alpine
// keep only one fresh message in queue : https://stackoverflow.com/questions/10585598/rabbitmq-messaging-initializing-consumer
// https://github.com/gls-lab/golos-notifications


import Rx from 'rx';
// import {PersistentWebsocket} from 'golos.lib/net';
import GolosD from 'golos.lib/data/source/golosd';

const dataSource = new GolosD('wss://ws.golos.io');
const socket = dataSource.transport;



// todo alternatively extend PersistentWebsocket to have something like openStream
const stream = (emitter, ename) => Rx.Observable.create(observer => {
  emitter[ename] = e => observer.next(e);
  // emitter.on('error', err => observer.error(err));
});

// const socket = new PersistentWebsocket('wss://ws.golos.io');

// Rx.Observable.create(observer => {
//   socket.onopen = e => observer.next(e);
//   // emitter.on('error', err => observer.error(err));
// })
stream(socket, 'onopen')
  .subscribe(
    next => {
      socket.send(
        JSON.stringify({
          id: 1,
          method: 'call',
          'params': ['database_api', 'set_block_applied_callback', [0]],
        }),
      );
    },
  );

Rx.Observable.create(observer => {
  socket.onmessage = e => observer.next(e);
  // emitter.on('error', err => observer.error(err));
})
  .map(dataEvent => JSON.parse(dataEvent.data))
  .filter(data => (data.method === 'notice' && data.params))
  .map(blockData => blockData.params[1][0])
  .map(blockData => ({
    // calculate and add the current block's number (chain head) for convenience
    index: parseInt(blockData.previous.slice(0, 8), 16),
    ...blockData,
  }))
  // .take(10)
  .subscribe(
    next => console.log(`[${next.index}]`),
    error => console.log('Observable error!', error),
  );


// Rx.Observable.fromEvent(socket, 'message')
//   .subscribe(
//     x => console.log('Success', x),
//     x => console.log('Error', x),
//     () => console.log('Complete'),
//   );


// socket.down
//   .map(dataEvent => JSON.parse(dataEvent.data))
//   // .switchMap(value => value
//   //   // This is the disposable stream!
//   //   // Errors can safely occur in here without killing the original stream
//   //   Rx.Observable.of(value)
//   //     .map(value => value)
//   //     .catch(error =>
//   //       // You can do some fancy stuff here with errors if you like
//   //       // Below we are just returning the error object to the outer stream
//   //       Rx.Observable.of(error)
//   //     )
//   // )
//   // .map(value => {
//   //   if (value instanceof Error) {
//   //     // Maybe do some error handling here
//   //     return `Error: ${value.message}`;
//   //   }
//   //   return value;
//   // })
//   .catch(error => Rx.Observable.empty())
//   .subscribe(
//     x => console.log('Success', x),
//     x => console.log('Error', x),
//     () => console.log('Complete'),
//   );


// let counter = 0;
// const inputStream = socket.down
//   .catch(e => console.log('Error parsing raw data!'))
//
//   .map(dataEvent => JSON.parse(dataEvent.data))
//   // todo: this gracefully restarts the stream somehow - take a look at the docs
//   .subscribe(
//     result => {
//       console.log(`[${counter}]`);
//       counter++;
//     },
//     error => {
//       console.log(`!!!!!!!!!!!!!!!!!!!!!!! error`);
//       console.log(error);
//     },
//   );


// import WS from 'ws';
// import RWS from 'reconnecting-websocket';
// import ObservableSocket from 'observable-socket';

// const socketStream = () =>
// https://stackoverflow.com/questions/47303096/how-to-get-all-messages-using-method-consume-in-lib-amqp-node
//  todo not working : UPR
// const socket = ObservableSocket(new PersistentWebsocket('ws://127.0.0.1:8090'));

// const socket = ObservableSocket(new RWS('wss:ws.golos.io', undefined, {constructor: WS}));


// const socket = new WS('ss://ws.golos.io');


// Send messages up the socket
// socket.up(
//   JSON.stringify({
//     id: 1,
//     method: 'call',
//     'params': ['database_api', 'set_block_applied_callback', [0]],
//   }),
// );
// // (info) struct set_block_applied_callback response
// const set_block_applied_callback_response = {
//   'id': 1,
//   'result': null,
// };
// // (info) struct set_block_applied_callback event data
// const block_applied_callback_data = {
//   'method': 'notice',
//   'params': [
//     0,
//     [
//       {
//         'previous': '00dae2de2d60992ba7494d3dfa4188de5d7a9b8b',
//         'timestamp': '2018-03-02T13:59:48',
//         'witness': 'ropox',
//         'transaction_merkle_root': '7c417b4b783af5d833a5c958615fca7fc1db1b04',
//         'extensions': [],
//         'witness_signature': '1f6f4da49a4f2444edeec2f68708db51a9d3698877735ad49a7ec8acc8509e97f9719fb65cec2686df3d8ef79eca68506b9093ddc360a89e89d763723156e25cd9',
//       },
//     ],
//   ],
// };
// // raw socket stream -> JSON data stream
// const inputStream = socket.down
//   .map(dataEvent => JSON.parse(dataEvent.data))
//   // todo: this gracefully restarts the stream somehow - take a look at the docs
//   .catch(e => console.log('Error parsing raw data!'));
// // transform to stream of applied block numbers
// const blockStream = inputStream
//   .filter(data => (data.method === 'notice' && data.params))
//   .map(blockData => blockData.params[1][0])
//   .map(blockData => ({
//     // calculate and add the current block's number (chain head) for convenience
//     index: parseInt(blockData.previous.slice(0, 8), 16),
//     ...blockData,
//   }));
// // .take(5)
// const transactions = blockStream.switchMap(block => {
//   socket.up(
//     JSON.stringify({
//       id: 2,
//       method: 'call',
//       params: ['database_api', 'get_ops_in_block', [block.index, 'false']],
//     }));
//   // filter out get_ops_in_block responses from the root JSON stream
//   return inputStream
//     .filter(msg => msg.id === 2)
//     // return flattened stream of transactions
//     .flatMap(data => data.result);
// });
//
// blockStream.subscribe(o => console.log(`[${o.index}] -------------------------------------------`));
//
//
// // transform transaction stream into an operation stream
// const ops = transactions
//   .map(trx => trx.op);

// ops.subscribe(o => console.log('[x]', o));

// const votes = ops
//     .filter(op => op[0] === 'vote')
//     .map(op => {
//         const {author} = op[1]
//         console.log(`>>>>>>>>>`, op[1])
//     })
// .groupBy(vote => vote.author)


// const votes = ops
//   .filter(op => op[0] === 'vote')
//   .map(op => op[1])
//   .groupBy(x => x.author)
//   .switchMap(group => group.toArray())

// .toArray()
// .switchMap(group => group.toArray())
// .switchMap(ops => {
//     // return ops.groupBy(vote => vote.author)
//     //
//     //
//     //
//     //     return ops
//     //         .flatMap(data => data.result)
// })


// // .switchMap(op => op.groupBy(payload => payload.author))
// .switchMap(group => group)
// // .toArray()
// votes.subscribe(o => console.log(`[v][receiver] ${o[1].author}`));
// votes.subscribe(o => console.log('[-]', o));
