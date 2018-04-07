import {Message} from './abstract';
import {api} from 'golos-js';

// see the op shape under the class
export default class Comment
  extends Message {
  //
  async compose() {
    //
    const {
      op: {
        payload: {
          author,
          parent_author,
          parent_permlink
        }
      }
    } = this;
    //
    // console.log('++++++++++++++++++++++++++++++');
    // console.log(this.op);
    //
    const data = await api.getContentAsync(
      parent_author,
      parent_permlink
    );
    //
    const userData = await api.getAccountsAsync([author]);
    const [{json_metadata: mdStr}] = userData;
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
      console.log('**************** ', metadata, mdStr);
    }
    //
    this.op.payload.author = {
      author,
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
      body
    } = data;
    //
    this.op.payload = {
      parent_title: title,
      parent_body: body,
      parent_depth: depth,
      ...this.op.payload
    };
    //
    return data;
  }
  //
  get web() {
    //
    const {
      type,
      payload: {
        // commenter id
        // this should be an object with encoded avatar
        author,
        // permlink of comment itself
        permlink,
        // the author of what was commented
        parent_author,
        // depth of what was commented
        parent_depth,
        // link to what was commented
        parent_permlink,
        // title of what was commented
        parent_title,
        // body of what was commented
        parent_body,
        ///////////////////
        acc
      }
    } = this.op;
    //
    return {
      channel: parent_author,
      action: {
        type: 'NOTIFY_COMMENT',
        payload: {
          author,
          permlink,
          parent: {
            type: (parent_depth > 0 ? 'comment' : 'post'),
            permlink: parent_permlink,
            title: parent_title,
            body: parent_body
          }
        }
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
