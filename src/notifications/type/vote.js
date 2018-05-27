import AbstractNotification from './abstract';
//
export default class Vote extends AbstractNotification {
  // rule to detect the target user of this notification
  get target() {
    return this.author;
  }
  //
  async compose({blockIndex, opIndex, timestamp}) {
    super.compose({blockIndex, opIndex, timestamp})
    //
    const {author, voter, permlink} = this;
    const {chain} = this;
    //
    const votedContent = await chain.getContentAsync(
      author,
      permlink
    );
    //
    const voterData = await chain.getAccountsAsync([voter]);
    const [{json_metadata: mdStr}] = voterData;
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
    this.voter = {
      account: voter,
      profile_image: avaUrl
    };
    // console.log(`$$$$$$$$$$$$$$ `, profile_image)
    //
    const {
      // to create post representation for client
      title,
      // to detect if it was a post or a comment
      depth,
      // comment does not have a title, but has body
      body,
      // url of voted object
      url
    } = votedContent;
    // complement operation payload

    // complement operation payload
    Object.assign(this, {
      parent_url: url,
      parent_title: title,
      parent_body: body,
      parent_depth: depth,
      ...this
    });
    return this;


    // this.op.payload = {
    //   parent_title: title,
    //   parent_body: body,
    //   parent_depth: depth,
    //   parent_url,
    //   ...this.op.payload
    // };


  }
  //
  get web() {
    return {
      targetId: this.author,
      action: {
        type: (this.weight > 0 ? 'NOTIFY_VOTE_UP' : 'NOTIFY_VOTE_DOWN'),
        payload: {
          timestamp: this.timestamp,
          count: this.count,
          weight: this.weight,
          voter: this.voter,
          parent: {
            type: (this.parent_depth > 0 ? 'comment' : 'post'),
            permlink: this.permlink,
            title: this.parent_title,
            // this can be huge!
            body: this.parent_body,
            url: this.parent_url
          }
        }
      }
    };
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
      (this.weight > 0 ? 'voteup' : 'votedown'),
      // model.targetId
      this.target,
      // model.touched
      0,
      JSON.stringify({
        voter: this.voter,
        parent: {
          type: (this.parent_depth > 0 ? 'comment' : 'post'),
          title: this.parent_title,
          // this can be huge!
          // body: this.parent_body,
          url: this.parent_url
        }
      })
    ];
  }
  //
  get gcm() {
    const {
      payload: {
        voter,
        // permlink of comment itself
        permlink: parent_permlink,
        // the author of what was commented
        author: parent_author,
        // depth of what was commented
        parent_depth,
        // title of what was commented
        parent_title,
        // body of what was commented
        parent_body,
        // url of what was commented
        parent_url,
        //
        weight
      },
      count
    } = this.op;
    //
    //
    return {
      topic: parent_author,
      data: {
        type: (weight > 0 ? 'upvote' : 'downvote'),
        // {account, profile_image}
        voter,
        // permlink of voted stuff
        parent_permlink,
        // the author of voted stuff
        parent_author,
        // depth of voted stuff
        parent_depth,
        // title of voted stuff
        parent_title,
        // body of voted stuff
        parent_body, /**/
        // url of voted stuff
        parent_url,
        // how many times this url was UPvoted in block
        count,
        //
        weight
      }
    };
  }

}
//
// let op = {
//   author: "c153048",
//   body: "Ответ на пост",
//   json_metadata: "{"tags":["sdfdsf"],"app":"golos.io/0.1"}",
//   parent_author: "a153048",
//   parent_permlink: "a153048-post6",
//   permlink: "re-a153048-a153048-post6-20180405t162449022z",
//   title: "",
//   type: "comment"
// }
