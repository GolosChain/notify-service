/* eslint-disable quotes */
import {Golos} from 'golos.lib';
import {Queue} from 'golos.lib';
import punycode from 'punycode';
import {colorConsole} from 'tracer';

// Data flow:
// <-- stream of events from the sniffer
// <-- blocks ---x-------x----x
// <-- transactions ---x-------x----x
// <-- ops ---x-------x----x
// <------- group ops by user id ---x-------x----x
// Use tarantool queue to keep the message sequences
// Name the corresponding queue after user id?
// Unlike the Rabbit, Tarantool's space (queue) must be alphanumeric-named.
// Golos user id can contain dots, dashes (check - maybe some other specials?) however.
// So, encode the id to be unique and decodable as such:
// Transform each character of the whole each unique golos ID into the string sequence
// of each ID's character's Unicode point.
// String(Number(point))--String(Number(point))--...
// Each generated sequence appears to be a unique one and tarantool friendly.
// This allows simply encode string and decode it back unlike the hashing
// which works in a single direction only.
// Name the tarantool queue after generated sequence, this gonna be the user's queue
// Which can be a UTUBE to keep the order of each corresponding notification type (if needed).


//   Nodejs  string encoding:
//   https://kev.inburke.com/kevin/node-js-string-encoding/
//
//     So, we should use 'codePointAt' :
// https://stackoverflow.com/questions/40841149/unicode-charcodeat-equivalent-in-php
//
//   https://www.codesd.com/item/how-to-take-an-array-of-strings-and-get-the-ascii-value-of-each-character-in-each-string-in-java.html

const logger = colorConsole()

const qName = userId => punycode.ucs2
  .decode(userId)
  .map(c => `_${c.toString(16)}`)
  .join('');


const q = new Queue({port: 3301});

q.on('connect', async() => {
  // const ok = await q.assertTube('q2', 'fifo');
  // const stat = await q.statistics();
  // console.log(stat);
  // const put = await q.put({
  //   tube_name: 'q2',
  //   task_data: 'blaaaaaaaaaaaa'
  // });
  // console.log(`put:`, put);
  // const taken = await q.take('q2', 10);
  // const takenId = taken[0];
  // console.log(`taken:`, taken);
  // console.log(`taken id : ${takenId}`);
  // const acked = await q.ack('q2', takenId);
  // console.log(`acked:`, acked);
  logger.trace('Queue connected');
});


const start = async() => {
  const golosd = new Golos();
  const {blocks} = golosd;
  blocks
    .subscribe(
      async block => {
        for (const op of block.operations) {
          const {target} = op;
          const qn = qName(target);
          await q.assertTube(qn, 'fifo');
          const put = await q.put({
            tube_name: qn,
            task_data: op.type
          });
        }
        console.log(`[processed] ${block.index}`);

      }
    );
};

start();

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


// };

// start();

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
