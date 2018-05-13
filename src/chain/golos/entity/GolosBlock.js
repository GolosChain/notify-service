/* eslint-disable quotes */
import {api as chain, config as chainConfig} from 'golos-js';
import Block from 'chain/golos/entity/GolosBlock';
// get the golosD endpoint url from environment var
const {API_GOLOS_URL} = process.env;
// config golos-js
if (API_GOLOS_URL) {
  chainConfig.set(
    'websocket',
    API_GOLOS_URL
  );
}
//
function flattenOperations(transactions) {
  let count = 0;
  let result = [];
  for (const trx of transactions) {
    const {operations} = trx;
    result = [...result, ...operations];
    count = count + operations.length;
  }
  // console.log('TRXS: ', transactions.length);
  // console.log('count: ', count);
  // console.log('result: ', result.length);
  return result;
}
//
export default class GolosBlock {
  //
  get index() {
    const {previous} = this;
    const current = parseInt(previous.slice(0, 8), 16) + 1;
    return current;
  }
  //
  // composes an instance of service block object (this) fetching missing data if needed
  // block: chain block representation || block number
  //
  static async compose(data) {
    // console.log('############ ', typeof data);
    data = (typeof data === 'number') ? await chain.getBlock(data) : data;
    const {transactions} = data;
    data.operations = flattenOperations(transactions)
    return new GolosBlock(data);
  }
  //
  constructor(data) {
    // select transactions
    Object.assign(this, {...data});
    // const {transactions} = this;
    // this.operations = this.flattenOperations(transactions);
  }
}
//
const composeBlock = async(data, blocknum) => {
  // start block construction
  let block = {};
  // fast forward mode
  if (data) {
    // 0.17
    let {
      result: info
    } = data;
    // 0.16
    if (!info) {
      const {params: [, [result]]} = data;
      info = result;
    }
    const {previous} = info;
    const index = parseInt(previous.slice(0, 8), 16) + 1;
    //
    block = {index, ...info};
  } else {
    // fast forward mode - no block data here
    block = {
      index: blocknum
    };
  }
  // check if transactions already exist (0.17)
  let {transactions, index} = block;
  // if (!transactions) {
  // transactions is undefined (either fast forward or 0.16)
  // request them
  console.log(`[${index}] requesting ...`);
  // transactions = await this.getBlockTransactions(index);
  transactions = await api.getOpsInBlock(index);

  // }
  // });


  // console.log('!!!!!!!!!!!!!!!!!!!!!!!!! ', transactions);
  // }
  //
  const operations = transactions
    .map(trx => {


      const {
        // 0.16
        op,
        // 0.17
        operations
      } = trx;
      // todo now processes only one op per transaction!
      const opsArray = op || operations;
      let type, payload;
      if (operations) {
        // 0.17
        type = opsArray[0][0];
        payload = opsArray[0][1];
      }
      if (op) {
        // 0.16
        type = opsArray[0];
        payload = opsArray[1];

      }
      // console.log({type, payload});
      return {
        block: index,
        type,
        payload,
      };
    });
  //
  block = {
    index,
    operations
  };


  return block;
}
