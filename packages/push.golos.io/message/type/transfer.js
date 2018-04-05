import {Message} from './abstract';
import {api} from 'golos-js';
// see the op shape under the class
export default class Transfer extends Message {
  //
  async compose() {
  }
  // transfer
  // enough data from chain - nothing to fetch
  get web() {
    //
    const {op:
      {type, from, to, amount, memo}
    } = this;
    //
    return {type, from, amount,
      // todo use consts
            text: 'перевел вам'
    };
  }
}
// op
// {
//     type: "transfer",
//     from: "a153048",
//     to: "b153048",
//     amount: "10.000 GOLOS",
//     memo: ""
// }
