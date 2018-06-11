/* eslint-disable quotes */
import GolosApi from 'chain/golos/api';
import NotificationList from 'notifications/NotificationList';
import _ from 'lodash';
import Tarantool from 'db/Tarantool';
const tnt = new Tarantool();
//
export default class GolosBlock extends GolosApi {
  //
  flattenOperations(transactions) {
    let count = 0;
    let result = [];
    for (const trx of transactions) {
      const {operations} = trx;
      result = [...result, ...operations];
      count = count + operations.length;
    }
    return result;
  }
  //
  get index() {
    // mirrors this.previous
    // so, some checking's needed
    const {previous, _index} = this;
    const current = previous ? parseInt(previous.slice(0, 8), 16) + 1 : _index;
    return current;
  }
  //
  get operations() {
    if (!this._operations) {
      this._operations = this.flattenOperations(this.transactions);
    }
    return this._operations;
  }
  // composes an instance of service block object (this) fetching missing data if needed
  // block: chain block representation || block number
  async compose() {
    // index presence is a must
    const {index, transactions} = this;
    //
    if (!transactions) {
      // incomplete block. fetch additional data
      console.log('... getting transactions')
      const data = await this.chain.getBlock(index);
      console.log('... ok')
      //  fill
      Object.assign(this, {...data});
    }
    // now enough data to compose notifications
    console.log('... composing NotificationList')
    this.notifications = await new NotificationList(this).compose();
    console.log('... ok')
    // start composing state diffs for target clients
    this.state = {};
    // all supported notifications for block are composed and saved
    // group the raw list by target user
    console.log('... composed total : ', this.notifications.list.length)
    console.log('... grouping by target')
    const targets = _.groupBy(this.notifications.list, notification => notification.target);
    console.log('... ok')
    // store state changes for each target user under 'state' key
    for (const target in targets) {
      console.log('... getting count for ', target)
      const [[untouched_count]] = await tnt.call('get_untouched_count_by_target', target);
      this.state[target] = {
        notifications: {
          untouched_count,
          list: targets[target]
        }
      };
    }
    // return composed block to the caller
    return this;
  }
  // accepts either number or a chain-shaped block object
  constructor(x) {
    super();
    // check input
    if (typeof x === 'number') {
      this._index = x;
    } else if (typeof x === 'object') {
      Object.assign(this, {...x});
    }
  }
}
