// docker run -d --hostname my-rabbit --name some-rabbit -p 8080:15672 -p 5672:5672 rabbitmq:3.7.3-management-alpine
// keep only one fresh message in queue : https://stackoverflow.com/questions/10585598/rabbitmq-messaging-initializing-consumer
// https://github.com/gls-lab/golos-notifications

// make this module's directory a root for all further imports (get rid of '../../')
import Endpoints from 'golos.lib/net/endpoint';

import WS from 'ws';
import ObservableSocket from 'observable-socket';
import Rx from 'rx';
import {PersistentWebsocket} from 'golos.lib/net';
// const Endpoints = require('golos.lib/net/endpoint');

// console.log(PersistentWebsocket);


// queue message producer
// golosd api cunsumer
export default class GProxy {
  // https://tc39.github.io/proposal-class-public-fields/
  source;
  target;
  // logger = intel;
  // events (for datasource)
  on = {
    open: e => {
      console.clear();
      console.log('[connection] --------------------------------------- opened');
      console.log('[connection] setting block applied hook');
      // todo api should be used here
      this.source.transport.send(
        JSON.stringify({
          id: 1,
          method: 'call',
          'params': ['database_api', 'set_block_applied_callback', [0]],
        }),
      );
    },
    message: e => {
      const {data} = e;
      try {
        const info = JSON.parse(data);
        // message struct differs
        const {
          id,
          method,
          params,
          result,
        } =
          info;
        // set_block_applied_callback
        const hookSet = (id === 1);
        // set_block_applied_callback block application message
        const blockInfo = (method === 'notice' && params);
        // get_ops_in_block(blocknum) response message
        const blockOpsInfo = (id === 2);
        // console.log(blockInfo);
        // set_block_applied_callback result
        if (hookSet) {
          console.log('[x] block application hook is set.');
        }
        // set_block_applied_callback data
        if (blockInfo) {
          const { // block info struct
            extensions,
            previous,
            timestamp,
            transaction_merkle_root,
            transactions,
            witness,
            witness_signature,
          } =
            params[1][0];

          const prevHex = previous.slice(0, 8);
          const prev = parseInt(prevHex, 16);
          const height = prev + 1;
          console.log(`[block generated] : ${height}`);

          // this.source.transport.send(JSON.stringify({
          //   id: 2,
          //   method: 'call',
          //   params: ['database_api', 'get_ops_in_block', [height, 'false']]
          // }), e => {
          //   if (e) return console.warn(e);
          // });


        }

        if (blockOpsInfo) {

          console.log('<<<<<<<<<<<< ops');
          console.log(result);

        }


      } catch (e) {
        //   error parsing data - reconnect?

        console.log('-------- error');
        console.log(e);

      }
    },
    // todo move this to endpoint implementation
    // only override here if needed
    error: e => {
      // 429 Too Many Requests
      console.log('eeeeeeeeeeeeeeerrror');
      console.log(e.message);
    },
  };

  constructor({source, target}) {
    // const { golosD } = Endpoints;
    // this.source = new golosD({uri: source});
    // this.target = amqp;

  }

  bindCallbacks = () => {
    for (const callback in this.on) {
      this.on[callback] = this.on[callback].bind(this);
    }
  };

  initTarget = async() => {
    const {queue} = this;
    console.log('[target connection] creating ...');
    const targetInstance = await queue.connect('amqp://localhost');
    console.log('[target channel] created');

    const targetChannel = await targetInstance.createChannel();
  };

  start = () => {
    // this.bindCallbacks();
    // console.log('<<<<<<<<<< connecting source');
    // this.source.connect({callbacks: this.on});
    // console.log('<<<<<<<<<< connecting target');
    // this.target.connect('amqp://guest:guest@localhost:5672', (err, conn) => {
    //   if (err) {
    //     console.log('<< error');
    //     console.log(err);
    //     return;
    //   }
    //   conn.createChannel((err, ch) => {
    //     const q = 'head';
    //     ch.assertQueue(q, {durable: false});
    //     // Note: on Node 6 Buffer.from(msg) should be used
    //     ch.sendToQueue(q, new Buffer('Hello World!'));
    //     console.log(" [x] Sent 'Hello World!'");
    //
    //     // const msg = '123456';
    //     // const ex = 'head';
    //     // ch.assertExchange(ex, 'x-recent-history', {durable: false});
    //     //
    //     //
    //     // for (let i = 0; i < 30; i++) {
    //     //   ch.publish(ex, '', new Buffer(String(i)));
    //     //   console.log(' [x] Sent %s', i);
    //     //
    //     // }
    //     //
    //     //
    //     // ch.assertQueue('', {exclusive: true}, (err, q) => {
    //     //   console.log(' [*] Waiting for messages in %s. To exit press CTRL+C', q.queue);
    //     //   ch.bindQueue(q.queue, ex, '');
    //     //
    //     //   ch.consume(q.queue, msg => {
    //     //     console.log(' [x] %s', msg.content.toString());
    //     //   }, {noAck: true});
    //     //
    //     //
    //     // });
    //
    //
    //   });
    // });


    // https://stackoverflow.com/questions/47303096/how-to-get-all-messages-using-method-consume-in-lib-amqp-node

    //  todo not working : UPR
    // const socket = ObservableSocket(new PersistentWebsocket('ws://127.0.0.1:8090'));


    // const socket = ObservableSocket(new WS('ws://127.0.0.1:8090'));
    const socket = ObservableSocket(new WS('wss:ws.golos.io'));


    // Send messages up the socket
    socket.up(
      JSON.stringify({
        id: 1,
        method: 'call',
        'params': ['database_api', 'set_block_applied_callback', [0]],
      }),
    );
    // (info) struct set_block_applied_callback response
    const set_block_applied_callback_response = {
      'id': 1,
      'result': null,
    };
    // (info) struct set_block_applied_callback event data
    const block_applied_callback_data = {
      'method': 'notice',
      'params': [
        0,
        [
          {
            'previous': '00dae2de2d60992ba7494d3dfa4188de5d7a9b8b',
            'timestamp': '2018-03-02T13:59:48',
            'witness': 'ropox',
            'transaction_merkle_root': '7c417b4b783af5d833a5c958615fca7fc1db1b04',
            'extensions': [],
            'witness_signature': '1f6f4da49a4f2444edeec2f68708db51a9d3698877735ad49a7ec8acc8509e97f9719fb65cec2686df3d8ef79eca68506b9093ddc360a89e89d763723156e25cd9',
          },
        ],
      ],
    };
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
        ...blockData,
      }));
    // .take(5)
    const transactions = blockStream.switchMap(block => {
      console.log(`[block] ${block.index}`);
      socket.up(
        JSON.stringify({
          id: 2,
          method: 'call',
          params: ['database_api', 'get_ops_in_block', [block.index, 'false']],
        }));
      // filter out get_ops_in_block responses from the root JSON stream
      return inputStream
        .filter(msg => msg.id === 2)
        // return flattened stream of transactions
        .flatMap(data => data.result);
    });
    // transform transaction stream into an operation stream
    const ops = transactions
      .map(trx => trx.op)


    // transactions.subscribe(o => console.log(o));
    ops.subscribe(o => console.log(o));


    // transactions.subscribe(o => console.log(o));
    // ops.subscribe(o => console.log(o));
    // blockStream.subscribe(o => console.log(o.index))

    // const bla = Rx.Observable.from([[1, 2], [3, 4], [6]])
    //   .flatMap(o => Rx.Observable.from(o))
    //   .subscribe(i => console.log(i))


    // transactions.subscribe(o => console.log(o));
    // ops.subscribe(o => console.log(o));


    //
    // const ops = trxStream
    //   // .flatMap(trxs => Rx.Observable.from(trxs))
    //   // .map(trx => trx.op[0])
    //   .subscribe(op => console.log(op));
    //
    //
    // //
    // // const ops = transactions
    // //   .flatMap(trxs => Rx.Observable.from(trxs))
    // //   .map(trx => trx.op[0])
    // //   .subscribe(op => console.log(op));
    //
    // // const bla = ['bla', 'blu'];
    // // const blu = [...bla, 'clu'];
    // // console.log(blu)
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //


  };


}
