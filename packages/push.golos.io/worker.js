import _ from 'lodash';
import {config} from 'golos-js';
import SCWorker from 'socketcluster/scworker';
import chains from 'chain.golos.lib';
import message from './message/producer';
//
const {Golos} = chains;
config.set('websocket', 'wss://ws.golos.io'/*'ws://127.0.0.1:8091'*/);
//
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
    this.golos.on('block', async block => {
      const {operations} = block;
      // console.log(`^^^^^^^^^^^^^^^^^ `, operations[0])
      const messages = operations
        // can produce a sparsed array
        // since unimplemented message will be null
        .map(op => message(op))
        // so, filter out implemented only
        .filter(op => op);
      // for of to process awaits correctly
      for (const message of messages) {
        // make additional operations on message
        // defined by its compose() method
        await message.compose();
        // console.log(`composed : ${message.type}`);
        console.log('[composed >]', message.op.type);
        // message.web: select target channel and redux action
        const {
          web: {
            channel,
            action
          }
        } = message;
        // console.log('+++++++++++++++++ ', action);
        // scServer.exchange.publish(channel, action);
        // scServer.exchange.publish('a153048', action);
      }
      // all the data we needed is here
      // group, aggregate on block level
      //
      // no processing for transfers
      const transfers = messages.filter(m => m.op.type === 'transfer');
      // group comment events by publication
      // to aggregate their count
      let comments = messages.filter(m => m.op.type === 'comment');
      comments = Object.values(
        _.groupBy(comments, comment => comment.op.payload.parent_url)
      )
        .map(arrayOfMessages => {
          const count = arrayOfMessages.length;
          //  the first member will always represent enough info
          //  for further processing
          const message = arrayOfMessages[0];
          //  save comments count
          message.op.count = count;
          return message;
        });
      // group vote events by publication
      // to aggregate their count
      let votes = messages.filter(m => m.op.type === 'vote');
      // console.log(votes[0]);
      votes = Object.values(
        _.groupBy(votes, vote => vote.op.payload.parent_url)
      )
        .map(arrayOfMessages => {
          // arrayOfMessages.forEach(m => {
          //   console.log(parseInt(m.op.payload.weight));
          // });
          const count = arrayOfMessages.length;
          //  the first member will always represent enough info
          //  for further processing
          const message = arrayOfMessages[0];
          //  save comments count
          message.op.count = count;
          return message;
        });
      //
      //
      //
      // const votes = messages.filter(m => m.op.type === 'vote');
      // if (votes.length) {
      //   scServer.exchange.publish('a153048', votes);
      // }
      //
      // mix everything up
      const outbox = [...transfers, ...comments, ...votes];
      // send everything
      for (const message of outbox) {
        // message.web: select target channel and redux action
        const {
          web: {
            channel,
            action
          }
        } = message;
        // console.log('+++++++++++++++++ ', action);
        // scServer.exchange.publish(channel, action);
        scServer.exchange.publish('a153048', action);
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
