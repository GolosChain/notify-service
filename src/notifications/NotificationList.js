import GolosApi from 'chain/golos/api';
import Notification from 'notifications/Notification';
// import Tarantool from 'tarantool-driver/lib/connection';
// const tnt = new Tarantool({host: 'localhost', port: 3301});
import Tarantool from 'db/Tarantool';
const tnt = new Tarantool();
//
export default class NotificationList extends GolosApi {
  //
  selectFrom(operations) {
    return operations
      // can return undefined
      .map(op => Notification(op))
      // remove undefineds
      .filter(op => op);
  }
  //
  async compose() {
    const {block: {index: blockIndex, timestamp, operations}} = this;
    // transform each raw block operation into push-notification
    this.list = this.selectFrom(operations);
    let opIndex = 0;
    //
    for (const notification of this.list) {
      // make additional async operations on each notification
      // defined by its compose() method
      await notification.compose({blockIndex, opIndex, timestamp});
      // save composed notification
      const result = await notification.save(tnt)

      opIndex++;
    }
    return this;
  }
  //
  constructor(block) {
    super();
    this.block = block;
  }
}
