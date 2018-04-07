import {config} from 'golos-js';
import SCWorker from 'socketcluster/scworker';
import chains from 'chain.golos.lib';
import {defs} from 'chain.golos.lib';
import produceMessage from './message/producer';


const {Golos} = chains;
const {Operation} = defs;
config.set('websocket', 'wss://ws.golos.io'/*'ws://127.0.0.1:8091'*/);


class Worker extends SCWorker {
  run() {
    console.log('   >> Worker PID:', process.pid);
    const scServer = this.scServer;
    //
    this.golos = new Golos({
      rpcIn: 'wss://ws.golos.io',
      // rpcIn: 'ws://127.0.0.1:8091',
      // tarantool queue is a must for now
      rpcOut: {
        // host and something else may exist here ...
        port: 3301
      }
    });
    //
    this.golos.on(
      'block',
      async block => {
        const {operations} = block;
        const messages = operations
          // can produce a sparsed array
          // since unimplemented message will be null
          .map(op => {
            if (op.type === 'comment') {
              // console.log(`>>>>>>>>> `, op.type)
              const ms = produceMessage(op);
              // if (!ms) {
              // console.log('op :::: ', op);
              // }


              // const msg = op;
              // console.log(`>>>>>>>>> `, msg.type)
              return ms;
            } else {
              console.log('[x] ', op.type);
              return null;
            }
          }
          )
          // so, filter out implemented only
          .filter(op => op);
        // for of to process awaits correctly
        for (const message of messages) {
          // make additional operations on message
          // defined by its compose() method
          await message.compose();
          // console.log(`composed : ${message.type}`);
          console.log('[>]', message.op.type);
          //
          // const {
          //   web: {
          //     channel,
          //     action
          //   }
          // } = message;
          // scServer.exchange.publish(channel, action);
          scServer.exchange.publish('a153048', message.web);
        }


        // .filter(op => Operation.implemented(op))
        // // insert target channel name for each op
        // // (golos userId)
        // .map(op => Operation.instance(op))
        // .map(op => {
        //   // send everything
        //   // (transfer, comment for now)
        //   const {target, type} = op;
        //   // if (op.type === 'comment' || op.type === 'transfer') {
        //   scServer.exchange.publish('a153048', op);
        //   // }
        //   //
        //   console.log(`[${type}][${target}]`);
        // });


        //
        // console.log('[x] after');
        // for (const op of iOps) {
        //   console.log(op.type);
        // }


        //
        //
        // scServer.exchange.publish('a153048', block);
        //
        //
        //
        // // scServer.exchange.publish('b153048', block);
        // console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> published ', block.index);
        // console.log(`[${block.operations.length}]`);


      });


    /*
      In here we handle our incoming realtime connections and listen for events.
    */
    // scServer.on('connection', socket => {
    //
    //   // Some sample logic to show how to handle client events,
    //   // replace this with your own logic
    //
    //   socket.on('sampleClientEvent', data => {
    //     count++;
    //     console.log('Handled sampleClientEvent', data);
    //     scServer.exchange.publish('sample', count);
    //   });
    //
    //
    //   socket.on('disconnect', () => {
    //     clearInterval(interval);
    //   });
    // });

    // const interval = setInterval(() => {
    //   scServer.exchange.publish('a153048', {
    //     rand: c1
    //   });
    //   c1++;
    // }, 3000);
    //
    // const interval2 = setInterval(() => {
    //   scServer.exchange.publish('c153048', {
    //     rand: c2
    //   });
    //   c2--;
    // }, 5000);
    //
    // const interval3 = setInterval(() => {
    //   scServer.exchange.publish('b153048', {
    //     rand: c3
    //   });
    //   c3 = (c3 + 1) * 1000;
    // }, 5000);


  }
}

new Worker();
