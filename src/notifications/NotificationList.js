import GolosApi from 'chain/golos/api';
import Notification from 'notifications/Notification';
//
export default class NotificationList extends GolosApi {
  //
  selectFrom(operations) {
    return operations
      .map(op => Notification(op))
      .filter(op => op);
  }

  //
  async compose() {
    const {block: {operations, timestamp}} = this;
    // transform each raw block operation into push-notification
    // only if correcponding class is implemented
    // else generate undefined
    this.list = this.selectFrom(operations);
    for (const notification of this.list) {
      // mark each notification with current block's timestamp
      notification.timestamp = timestamp;
      // make additional async operations on each notification
      // defined by its compose() method
      await notification.compose();
      // console.log(`composed : ${notification.type}`);
      // console.log('[composed >]', message.op.type);
      // message.web: select target channel and redux action
      // const {
      //   web: {
      //     channel,
      //     action
      //   }
      // } = message;
      // console.log('+++++++++++++++++ ', action);
      // scServer.exchange.publish(channel, action);
      // scServer.exchange.publish('a153048', action);
    }

    // cache notifications in corresponding tnt space for further usage
    return this;
  }

  //
  async cache() {

  }

  //
  constructor(block) {
    super();
    this.block = block;
  }
}
