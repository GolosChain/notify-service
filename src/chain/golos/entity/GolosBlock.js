/* eslint-disable quotes */
import GolosApi from 'chain/golos/api';
import NotificationList from 'notifications/NotificationList';
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
      const data = await this.chain.getBlock(index);
      //  fill
      Object.assign(this, {...data});
    }
    // now enough data to compose notifications
    this.notifications = await new NotificationList(this).compose();
    // console.log(`--`);
    // console.log(this.notifications)
    this.notifications.list.map(i => console.log(`| ${i.web.targetId} <- (${i.type})`));
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
