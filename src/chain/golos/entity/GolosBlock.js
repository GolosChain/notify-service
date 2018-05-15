/* eslint-disable quotes */
import notification from 'notifications/notificationFactory';
import GolosApi from 'chain/golos/api';
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
  //
  get notifications() {
    return (async() => {
      if (!this._notifications) {
        const {operations} = this;
        // transform block operations into push-notifications
        // automatically caches notifications in corresponding tnt space for further usage
        const n = operations
        // can produce a sparsed array
        // since unimplemented message will be null
          .map(operation => notification(operation))
          // so, filter out implemented only
          .filter(op => op);
        // console.log('||||||||||||||||||||||||||||||||||||||||||||||||||||||')

        this._notifications = n;
      }
      return this._notifications;
    })();
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
    const n = await this.notifications;
    console.log(`--`);
    n.map(i => console.log(i.type));
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
