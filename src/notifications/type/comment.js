import AbstractNotification from './abstract';
//
export default class Comment extends AbstractNotification {
  //
  async compose() {
    //
    const { author, permlink, parent_author, parent_permlink } = this;
    const {chain} = this;
    //
    const commentedContent = await chain.getContentAsync(
      parent_author,
      parent_permlink
    );
    //
    const commentContent = await chain.getContentAsync(
      author,
      permlink
    );
    //
    // console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ ', commentedContent.url);
    const {url: comment_url} = commentContent;
    //
    const commenterData = await chain.getAccountsAsync([author]);
    const [{json_metadata: mdStr}] = commenterData;
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
    this.author = {
      account: author,
      profile_image: avaUrl
    };
    // console.log(`$$$$$$$$$$$$$$ `, profile_image)
    //
    const {
      // to create post representation for client
      title,
      // to detect if it was a post or a comment
      depth,
      // comment does not have a title, but has body (not always!)
      body,
      //
      url
    } = commentedContent;
    // complement operation payload
    Object.assign(this, {
      parent_url: url,
      parent_title: title,
      parent_body: body,
      parent_depth: depth,
      comment_url,
      ...this
    });
  }
  //
  get web() {
    //
    return {
      targetId: this.parent_author,
      action: {
        type: 'NOTIFY_COMMENT',
        payload: {
          timestamp: this.timestamp,
          count: this.count,
          // todo this should have been an array of authors
          // if count > 1
          author: this.author,
          comment_url: this.comment_url,
          permlink: this.permlink,
          parent: {
            type: (this.parent_depth > 0 ? 'comment' : 'post'),
            permlink: this.parent_permlink,
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
  get gcm() {
    //
    const {
      payload: {
        // commenter
        // {account, profile_image}
        author,
        // comment's url
        comment_url,
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
        // url of commented content
        parent_url
      },
      count
    } = this.op;
    //
    return {
      topic: parent_author,
      data: {
        type: 'comment',
        // commenter
        // {account, profile_image}
        author,
        // comment's url
        comment_url,
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
        // url of commented content
        parent_url,
        // how many times this url was commented in block
        count
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
