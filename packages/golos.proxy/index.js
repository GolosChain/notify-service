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

import {ObservableWebSocket} from 'golos.lib';
import ws from 'ws';
import { Observable } from 'rxjs';

const socket = ObservableWebSocket(new ws('wss://ws.golos.io'));
socket.up(
  JSON.stringify({
    id: 1,
    method: 'call',
    'params': ['database_api', 'set_block_applied_callback', [0]],
  }),
);
// raw socket stream -> JSON data stream
const inputStream = socket.down
  .map(dataEvent => JSON.parse(dataEvent.data))
  // todo: this gracefully restarts the stream somehow - take a look at the docs
  .catch(e => console.log('Error parsing raw data!'));
// transform to stream of applied block numbers
const blockStream = inputStream
  .filter(data => (data.method === 'notice' && data.params))
  .map(blockData => blockData.params[1][0])
  .map(blockData => ({
    // calculate and add the current block's number (chain head) for convenience
    index: parseInt(blockData.previous.slice(0, 8), 16),
    ...blockData
  }));
// .take(3);
// pull out a transaction stream for each block
const blockTrxs =
  blockStream
    .switchMap(block => {
      socket.up(
        JSON.stringify({
          id: 2,
          method: 'call',
          params: ['database_api', 'get_ops_in_block', [block.index, 'false']],
        }));
      // filter out get_ops_in_block responses from the root JSON stream
      return inputStream
        .filter(msg => msg.id === 2)
        // transform the transactions ARRAY into transactions STREAM
        .flatMap(x => Observable.from(x.result));
    });
//
const blockOps =
  blockTrxs
    .map(x => {
      // tuple -> object
      const [type, payload] = x.op;
      const {to, parent_author, author} = payload;
      // detect the message target
      let target;
      if (type === 'vote') {
        target = author;
      }
      if (type === 'comment') {
        // comment only, new post is not processed for now
        target = !(parent_author.length === 0) ? parent_author : target;
      }
      if (type === 'transfer') {
        target = to;
      }
      // define message target (golos userid) for further filtering
      return {target, type, ...payload};
    })
    // filter off ops that have undefined targets
    .filter(x => x.target);

// const opsByTarget =
//     trxOps
//         .groupBy(x => x.target)
//         .switchMap(x => x)
// .flatMap(x => Rx.Observable.from(x.result))
// .map(x => x.op)


//
blockStream.subscribe(o => console.log(`-------------------------------------------------------------------[ ${o.index} ]`));
// blockTrxs.subscribe(o => console.log(o));
// transactions.subscribe(o => console.log(o));
//
blockOps.subscribe(o => console.log(o.target, o.type));
