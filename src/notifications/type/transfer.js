import AbstractNotification from './abstract';
//
export default class Transfer extends AbstractNotification {
  //
  async compose() {
    //
    const {from} = this;
    const {chain} = this;
    //
    const senderData = await chain.getAccountsAsync([from]);
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
    this.from = {
      account: from,
      profile_image: avaUrl
    };
  }
  //
  get web() {
    //
    return {
      targetId: this.to,
      action: {
        type: 'NOTIFY_TRANSFER',
        payload: {
          timestamp: this.timestamp,
          from: this.from,
          to: this.to,
          amount: this.amount,
          memo: this.memo
        }
      }
    };
  }
  //
  get tnt() {
    //
    return [
      // model.timestamp
      this.timestamp,
      // model.type
      this.type,
      // model.targetId
      this.to,
      // model.touched
      0,
      JSON.stringify({
        from: this.from,
        amount: this.amount,
        memo: this.memo
      })
    ];
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

[ '16521526_0', '16521526', '2018-05-17T12:59:06', 'transfer', 'budimyr', 0, '{"from":{"account":"robot","profile_image":"bla"}' ]


