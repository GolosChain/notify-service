/* eslint-disable quotes */
import {Golos} from 'golos.lib';
import {Queue} from 'golos.lib';

// Data flow:
// <-- stream of events from the sniffer
// <-- blocks ---x-------x----x
// <-- transactions ---x-------x----x
// <-- ops ---x-------x----x
// <------- group ops by user id ---x-------x----x
// Use tarantool queue to keep the message sequences
// Name the corresponding queue after user id?
// Unlike the Rabbit, Tarantool's space (queue) must be alphanumeric-named.
// Golos user id can contain dots (check - maybe some other specials?) however.
// So, encode the id to be unique and decodable as such:
// Transform each character of the whole each unique golos ID into the string sequence
// of each ID's character's Unicode point.
// String(Number(point))--String(Number(point))--...
// Each generated sequence appears to be a unique one and tarantool friendly.
// This allows simply encode string and decode it back unlike the hashing
// which works in a single direction only.
// Name the tarantool queue after generated sequence, this gonna be the user's queue
// Which can be a UTUBE to keep the order of each corresponding notification type (if needed).


// const q = new Queue({port: 3301});
// q.on('connect', async() => {
//   const ok = await q.assertTube('q2', 'fifo');
//   const stat = await q.statistics();
//   const put = await q.put('q2', 'blaaaaaaaaaaaa');
//   console.log(`put:`, put);
//   const taken = await q.take('q2', 10);
//   const takenId = taken[0];
//   console.log(`taken:`, taken);
//   console.log(`taken id : ${takenId}`)
//   const acked = await q.ack('q2', takenId);
//   console.log(`acked:`, acked);
// });

const start = async() => {
  const golosd = new Golos();
  // const opens = golosd.streams.open;
  // console.log(opens)
  // opens.subscribe(
  //   async x => {
  //     console.log(`[xxxxxxx] socket open`);
  //     // console.log(`[ put block number into queue : ${tChainName} ]`);
  //   });
  // const {streams: {
  //   block
  // }} = golosd;
  //
  // block.subscribe(
  //   async x => {
  //     console.log(`-------------------------------------------------------------------[ ${x.index} ]`);
  //   // console.log(`[ put block number into queue : ${tChainName} ]`);
  //   // const put = await queue.put(tChainName, x.index);
  //   // console.log(`put:`, put);
  //   // const taken = await queue.take(tChainName);
  //   // const takenId = taken[0];
  //   // console.log(`taken:`, taken);
  //   // console.log(`taken id : ${takenId}`)
  //   // const acked = await queue.ack(tChainName, takenId);
  //   // console.log(`acked:`, acked);
  //   });


  // const queue = new Queue({port: 3301});
  // // top level queue (utube) - namespace for the blockchain subqueues
  // const tChainName = 'main';
  // const tHeadName = 'head';
  // console.log(`<<< asserting tube: ${tChainName}`);
  // const tChain = await queue.assertTube(tChainName, 'fifo');
  // console.log(`<<< tube: ${tChainName} is ${tChain}`);
  // //


  // function toluaOptions(optionsObject) {
  //   const result = '{}';
  //   try {
  //
  //     for (const op in optionsObject) {
  //       console.log(typeof optionsObject[op]);
  //     }
  //
  //     // const oString = JSON.stringify(optionsObject);
  //     // console.log(oString);
  //     // result = oString.replace(/:/g, '= ').replace(/"/g, ' ');
  //     // console.log(result);
  //     // return result;
  //   } catch (e) {
  //     //  log something about wrong object?
  //   } finally {
  //     return result;
  //   }
  // }
  //
  // toluaOptions({ttl: 60.1, delay: 80, utube: 'bla'});


  // console.log(toluaOptions({ttl: 60.1, delay: 80}));


};

start();


// import { PersistentWebSocket } from 'golos.lib';
// import { ObservableWebSocket } from 'golos.lib';
// import { Observable } from 'rxjs';
//
//
// const socket = ObservableWebSocket(new PersistentWebSocket('wss://ws.golos.io'));
//
// socket.up(
//   JSON.stringify({
//     id: 1,
//     method: 'call',
//     'params': ['database_api', 'set_block_applied_callback', [0]],
//   }),
// );
//
//
// // raw socket stream -> JSON data stream
// const inputStream = socket.down
//   .map(dataEvent => JSON.parse(dataEvent.data))
//   // todo: this gracefully restarts the stream somehow - take a look at the docs
//   .catch(e => {
//     console.log('Error parsing raw data!');
//     return Observable.empty();
//   });
// // transform to stream of applied block numbers
// const blockStream = inputStream
//   .filter(data => (data.method === 'notice' && data.params))
//   .map(blockData => blockData.params[1][0])
//   .map(blockData => ({
//     // calculate and add the current block's number (chain head) for convenience
//     index: parseInt(blockData.previous.slice(0, 8), 16),
//     ...blockData
//   }));
// // // .take(3);
//
//
// // pull out a transaction stream for each block
// const blockTrxs =
//   blockStream
//     .switchMap(block => {
//       socket.up(
//         JSON.stringify({
//           id: 2,
//           method: 'call',
//           params: ['database_api', 'get_ops_in_block', [block.index, 'false']],
//         }));
//       // filter out get_ops_in_block responses from the root JSON stream
//       return inputStream
//         .filter(msg => msg.id === 2)
//         // transform the transactions ARRAY into transactions STREAM
//         .flatMap(x => Observable.from(x.result));
//     });
// // //
// const blockOps =
//   blockTrxs
//     .map(x => {
//       // tuple -> object
//       const [type, payload] = x.op;
//       const {to, parent_author, author} = payload;
//       // detect the message target
//       let target;
//       if (type === 'vote') {
//         target = author;
//       }
//       if (type === 'comment') {
//         // comment only, new post is not processed for now
//         target = !(parent_author.length === 0) ? parent_author : target;
//       }
//       if (type === 'transfer') {
//         target = to;
//       }
//       // define message target (golos userid) for further filtering
//       return {target, type, ...payload};
//     })
//     // filter off ops that have undefined targets
//     .filter(x => x.target);
// // .filter(x =>
// //   (x.type === 'comment')
// //   ||
// //   (x.type === 'transfer')
// // );
//
// blockStream.subscribe(
//   o => console.log(`-------------------------------------------------------------------[ ${o.index} ]`),
//   e => console.log('<<<<<<<<<< Error'),
//   c => console.log('COMPLETE')
// );
