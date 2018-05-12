export default class GolosBlock {
  //
  get index() {
    const {previous} = this;
    const current = parseInt(previous.slice(0, 8), 16) + 1;
    return current;
  }
  //
  flattenOperations(transactions) {
    let count = 0;
    let result = [];
    for (const trx of transactions) {
      const {operations} = trx;
      result = [...result, ...operations];
      count = count + operations.length;
    }
    console.log('TRXS: ', transactions.length)
    console.log('count: ', count)
    console.log('result: ', result.length)
    return result;
  }
  //
  constructor(data) {
    // select transactions
    Object.assign(this, {...data});
    const {transactions} = this;
    this.operations = this.flattenOperations(transactions);
  }
}
