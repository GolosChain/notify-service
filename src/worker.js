import express from 'express';
import _ from 'lodash';
import gcm from 'node-gcm';
import healthChecker from 'sc-framework-health-check';
import morgan from 'morgan';
import SCWorker from 'socketcluster/scworker';
import GolosChainProxy from 'chain/golos/GolosChainProxy';
//
// const gcmSender = new gcm.Sender(API_GCM_KEY);
//

import Tarantool from 'db/Tarantool';
const tnt = new Tarantool();


class Worker extends SCWorker {
  run() {
    const scServer = this.scServer;
    this.golos = new GolosChainProxy();
    const restApi = express();
    restApi.use(morgan('dev'));
    // Add GET /health-check express route
    healthChecker.attach(this, restApi);
    const httpServer = this.httpServer;
    httpServer.on('request', restApi);
    const router = express.Router();
    //
    router.get('/:targetId?', async(req, res, next) => {
      // const {params: {id}} = req;
      // const resp = await tnt.call('notification_get_by_block', id);
      const {params: {targetId}} = req;
      const resp = await tnt.call('notification_get_by_target', targetId);
      // console.log(resp);
      res.json(resp);
    });
    //
    router.get('/:targetId?/count', async(req, res, next) => {
      // const {params: {id}} = req;
      // const resp = await tnt.call('notification_get_by_block', id);
      const {params: {targetId}} = req;
      const [[count]] = await tnt.call('get_untouched_count_by_target', targetId);
      console.log('------------------------------------- ', count);
      res.json({count});
    });
    //
    router.get('/:targetId?/:type', async(req, res, next) => {
      // const {params: {id}} = req;
      // const resp = await tnt.call('notification_get_by_block', id);
      const {params: {targetId, type}} = req;
      console.log('----------> ', targetId, type);
      // fixme get ALL notifications for account for now
      const list = await tnt.call('notification_get_by_target', targetId);
      res.json({type, list});
    });
    // start routing
    restApi.use('/api/v1', router);


    // this.golos.on('block', async block => {
    //   const {operations} = block;
    //
    //   console.log('<<<<<<<< a153048');
    //   scServer.exchange.publish('a153048', block);
    //   // return;
    //
    //   // console.log(`^^^^^^^^^^^^^^^^^ `, operations[0])
    //   const messages = operations
    //   // can produce a sparsed array
    //   // since unimplemented message will be null
    //     .map(op => message(op))
    //     // so, filter out implemented only
    //     .filter(op => op);
    //   // for of to process awaits correctly
    //   for (const message of messages) {
    //     // make additional operations on message
    //     // defined by its compose() method
    //     await message.compose();
    //     // console.log(`composed : ${message.type}`);
    //     // console.log('[composed >]', message.op.type);
    //     // message.web: select target channel and redux action
    //     // const {
    //     //   web: {
    //     //     channel,
    //     //     action
    //     //   }
    //     // } = message;
    //     // console.log('+++++++++++++++++ ', action);
    //     // scServer.exchange.publish(channel, action);
    //     // scServer.exchange.publish('a153048', action);
    //   }
    //   // all the data we needed is here
    //   // group, aggregate on block level
    //   //
    //
    //   // no processing for transfers
    //   const transfers = messages.filter(m => m.op.type === 'transfer');
    //   // group comment events by publication
    //   // to aggregate their count
    //   let comments = messages.filter(m => m.op.type === 'comment');
    //   //
    //   comments = Object.values(
    //     _.groupBy(comments, comment => comment.op.payload.parent_url)
    //   )
    //     .map(arrayOfMessages => {
    //       const count = arrayOfMessages.length;
    //       //  the first member will always represent enough info
    //       //  for further processing
    //       const message = arrayOfMessages[0];
    //       //  save comments count
    //       message.op.count = count;
    //       return message;
    //     });
    //   // group up_vote! events by publication
    //   // to aggregate their count
    //   let votes = messages.filter(m => m.op.type === 'vote' && parseInt(m.op.payload.weight) > 0);
    //
    //   // if (votes.length) {
    //   //   console.log('<<<<<<<< a153048');
    //   //   scServer.exchange.publish('a153048', votes);
    //   // }
    //
    //   let down_votes = messages.filter(m => m.op.type === 'vote' && parseInt(m.op.payload.weight) < 0);
    //
    //   down_votes = Object.values(
    //     _.groupBy(down_votes, vote => vote.op.payload.parent_url)
    //   )
    //     .map(arrayOfMessages => {
    //       // arrayOfMessages.forEach(m => {
    //       //   console.log(parseInt(m.op.payload.weight));
    //       // });
    //       const count = arrayOfMessages.length;
    //       //  the first member will always represent enough info
    //       //  for further processing
    //       const message = arrayOfMessages[0];
    //       //  save comments count
    //       message.op.count = count;
    //       return message;
    //     });
    //
    //   // if (down_votes.length) {
    //   //   console.log('@@@@@@@@@@@@@@@@@@@@@ a153048');
    //   //   scServer.exchange.publish('a153048', down_votes);
    //   // }
    //
    //
    //   // console.log(votes[0]);
    //   votes = Object.values(
    //     _.groupBy(votes, vote => vote.op.payload.parent_url)
    //   )
    //     .map(arrayOfMessages => {
    //       // arrayOfMessages.forEach(m => {
    //       //   console.log(parseInt(m.op.payload.weight));
    //       // });
    //       const count = arrayOfMessages.length;
    //       //  the first member will always represent enough info
    //       //  for further processing
    //       const message = arrayOfMessages[0];
    //       //  save comments count
    //       message.op.count = count;
    //       return message;
    //     });
    //   //
    //   // console.log('votes length : ', votes.length);
    //   // mix everything up
    //   const outbox = [
    //     ...transfers,
    //     ...comments,
    //     ...votes,
    //     ...down_votes
    //   ];
    //   // send everything
    //   for (const message of outbox) {
    //     // message.web: select target channel and redux action
    //     const {
    //       web: {
    //         channel,
    //         action
    //       }
    //     } = message;
    //     //
    //     const {
    //       gcm: {
    //         topic,
    //         data
    //       }
    //     } = message;
    //     //
    //     // Prepare a message to be sent
    //     const gcmMessage = new gcm.Message({
    //       data: {message: {...data}}
    //     });
    //     // scServer.exchange.publish('a153048', gcmMessage);
    //     //
    //     // if (message.op.type === 'transfer') {
    //     if (
    //       topic === 'yuri-vlad' ||
    //       topic === 'yuri-vlad-second' ||
    //       topic === 'jevgenika' ||
    //       topic === 'eparshin'
    //     ) {
    //       // scServer.exchange.publish('a153048', JSON.stringify(data));
    //       console.log(`${data.type} ---> ${topic}`);
    //       gcmSender.send(gcmMessage, {to: `/topics/${topic}`}, (err, response) => {
    //         if (err) console.error(err);
    //         else console.log('[gcm <<<] ', response);
    //       });
    //     }
    //     // }
    //     // console.log('+++++++++++++++++ ', action);
    //     // console.log('>>> ------- ', channel);
    //     scServer.exchange.publish(channel, action);
    //     console.log(`| ( ${message.op.type} ) -> ${channel}`);
    //     // console.log('<<<<<<<< a153048');
    //     // scServer.exchange.publish('a153048', data);
    //
    //     // console.log(action);
    //
    //     // if (message.op.type === 'vote' && message.op.weight < 0) {
    //     //   console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< a153048');
    //     //   scServer.exchange.publish('a153048', action);
    //     //   // scServer.exchange.publish('a153048', JSON.stringify(data));
    //     //   // scServer.exchange.publish('a153048', data);
    //     // }
    //
    //
    //     // if (message.op.type === 'vote') {
    //     //   console.log('<<<<<<<< a153048')
    //     //   scServer.exchange.publish('a153048', JSON.stringify(data));
    //     // }
    //
    //
    //     // if (message.op.type === 'transfer') {
    //     //   console.log('<<<<<<<< a153048')
    //     //   scServer.exchange.publish('a153048', JSON.stringify(data));
    //     // }
    //
    //
    //     // if (message.op.type === 'transfer') {
    //     //   console.log('<<<<<<<< a153048');
    //     //   scServer.exchange.publish('a153048', action);
    //     // }
    //
    //     // if (message.op.type === 'comment') {
    //     //   console.log('<<<<<<<< a153048');
    //     //   scServer.exchange.publish('a153048', data);
    //     // }
    //
    //     // if (message.op.type === 'comment') {
    //     //   console.log('<<<<<<<< a153048');
    //     // }
    //
    //
    //     // if (message.op.type === 'comment') {
    //     //   console.log('<<<<<<<< a153048');
    //     //   scServer.exchange.publish('a153048', action);
    //     //   // scServer.exchange.publish('a153048', JSON.stringify(action));
    //     // }
    //
    //
    //   }
    // });
  }
}

new Worker();
