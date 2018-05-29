import AbstractNotification from './abstract';
//
export default class Transfer extends AbstractNotification {
  // rule to detect the target user of this notification
  get target() {
    return this.to;
  }
  //
  async compose({blockIndex, opIndex, timestamp}) {
    super.compose({blockIndex, opIndex, timestamp})
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
    return this;
  }
  //
  get tnt() {
    //
    return [
      this.id,
      this.blockIndex,
      // model.timestamp
      this.timestamp,
      // model.type
      this.type,
      // model.targetId
      this.target,
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


