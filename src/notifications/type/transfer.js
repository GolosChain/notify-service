import {Message} from './abstract';
import {api} from 'golos-js';

// see the op shape under the class
export default class Transfer
  extends Message {
  //
  async compose() {
    //
    const {
      op: {
        payload: {
          from,
          to,
          amount,
          memo
        }
      }
    } = this;
    //
    // console.log('++++++++++++++++++++++++++++++');
    // console.log(this.op);
    //
    const senderData = await api.getAccountsAsync([from]);
    const [{json_metadata: mdStr}] = senderData;
    let avaUrl;
    let metadata;
    try {
      metadata = JSON.parse(mdStr);
      const {profile} = metadata;
      if (profile) {
        const {profile_image} = profile;
        avaUrl = profile_image;
      }
    } catch (e) {
      // console.log('**************** ', metadata, mdStr);
    }
    //
    this.op.payload.from = {
      account: from,
      profile_image: avaUrl
    };
    // console.log(`$$$$$$$$$$$$$$ `, profile_image)
    // return data;
  }
  //
  get web() {
    //
    const {payload} = this.op;
    const {to} = payload;
    //
    return {
      channel: to,
      action: {
        type: 'NOTIFY_TRANSFER',
        payload
      }
    };
  }
  //
  get gcm() {
    //
    const {payload} = this.op;
    const {to, from, amount, memo} = payload;
    //
    return {
      topic: to,
      data: {
        type: 'transfer',
        _from: from,
        _to: to,
        amount,
        memo
      }
    };
  }


}
//
// let op = {
// }
