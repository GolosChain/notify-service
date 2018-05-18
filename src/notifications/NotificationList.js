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
      .map(op => Notification(op))
      .filter(op => op);
  }
  //
  async compose() {
    const {block: {index, timestamp, operations}} = this;
    // transform each raw block operation into push-notification
    // only if correcponding class is implemented
    // else generate undefined
    this.list = this.selectFrom(operations);
    let count = 0;
    for (const notification of this.list) {
      // mark each notification with current block's timestamp
      notification.timestamp = timestamp;
      // make additional async operations on each notification
      // defined by its compose() method
      await notification.compose();
      let tuple = notification.tnt;
      //
      const nId = `${index}_${count}`;
      tuple = [nId, index.toString(), ...tuple];
      const resp = await tnt.call('notification_add', tuple);
      // // const resp1 = await tnt.call('notification_get_by_id', nId.toString());
      const [[ta, tb, ts, tp, tg]] = resp;
      console.log(`[${tb}][${ta}] : ${tp} -> ${tg}`);
      count++;
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
