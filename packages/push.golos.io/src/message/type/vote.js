import {Message} from './abstract';
import {api} from 'golos-js';
// see the op shape under the class
export default class Vote
  extends Message {
  //
  async compose() {
    //
    const {
      op: {
        payload: {
          author,
          voter,
          permlink
        }
      }
    } = this;
    //
    //
    const votedContent = await api.getContentAsync(
      author,
      permlink
    );
    //
    const voterData = await api.getAccountsAsync([voter]);
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
    this.op.payload.voter = {
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
      url: parent_url
    } = votedContent;
    // complement operation payload
    this.op.payload = {
      parent_title: title,
      parent_body: body,
      parent_depth: depth,
      parent_url,
      ...this.op.payload
    };
  }

  //
  get web() {
    //
    const {
      payload: {
        // commenter
        // {account, profile_image}
        author,
        //
        voter,
        // permlink of comment itself
        permlink,
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
    if (parent_depth > 0 && (parent_title.length > 0 && parent_body.length > 0)) {
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
      console.log(parent_title);
    }
    //
    return {
      channel: author,
      action: {
        // separate upvotes and downvotes
        type: (weight > 0 ? 'NOTIFY_VOTE_UP' : 'NOTIFY_VOTE_DOWN'),
        payload: {
          count,
          weight,
          // todo this should have been an array of voters
          // if count > 1
          voter,
          parent: {
            author,
            url: parent_url,
            type: (parent_depth > 0 ? 'comment' : 'post'),
            permlink,
            title: parent_title,
            body: parent_body
          }
        }
      }
    };
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
        // causes { error: 'MessageTooBig' } when sent to gcm topic!!!!!!!!!!!!!!!!!!!!!!!!!!
        // parent_body,

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
