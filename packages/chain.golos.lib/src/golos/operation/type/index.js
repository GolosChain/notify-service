/* eslint-disable quotes */
export default {
  vote: 0,
  comment: 1,
  transfer: 2,
  transfer_to_vesting: 3,
  withdraw_vesting: 4,
  limit_order_create: 5,
  limit_order_cancel: 6,
  feed_publish: 7,
  convert: 8,
  account_create: 9,
  account_update: 10,
  witness_update: 11,
  account_witness_vote: 12,
  account_witness_proxy: 13,
  pow: 14,
  custom: 15,
  report_over_production: 16,
  delete_comment: 17,
  custom_json: 18,
  comment_options: 19,
  set_withdraw_vesting_route: 20,
  limit_order_create2: 21,
  challenge_authority: 22,
  prove_authority: 23,
  request_account_recovery: 24,
  recover_account: 25,
  change_recovery_account: 26,
  escrow_transfer: 27,
  escrow_dispute: 28,
  escrow_release: 29,
  pow2: 30,
  escrow_approve: 31,
  transfer_to_savings: 32,
  transfer_from_savings: 33,
  cancel_transfer_from_savings: 34,
  custom_binary: 35,
  decline_voting_rights: 36,
  reset_account: 37,
  set_reset_account: 38,
  claim_reward_balance: 39,
  delegate_vesting_shares: 40,
  account_create_with_delegation: 41,
};
//
export class AbstractOperation {
  // abstract
  // get the target (e.g. user id or system) from operation data
  // to generate system event for it
  get target() {
    return null;
  }
  //
  constructor(data) {
    // merge passed data into an instance anyway
    const {type, payload} = data;
    Object.assign(this, {type, ...payload});
  }
}
//
export class Vote extends AbstractOperation {
  //
  get clientShape(/*todo insert flag for source or target*/) {
    return {
      type: this.type,
      voter: this.voter,
      permlink: this.permlink,
      // todo use consts
      text: `перевел вам ${this.amount}`
    };
  }
  //
  get target() {
    return this.author;
  }
  //
  constructor(data) {
    super(data);
  }
}
//
export class Comment extends AbstractOperation {
  //
  get clientShape(/*todo insert flag for source or target*/) {
    return {
      type: this.type,
      author: this.author,
      parent_permlink: this.parent_permlink,
      // todo use consts
      text: `ответил на ваш пост/комментарий`
    };
  }
  //
  get target() {
    return this.parent_author;
  }
  //
  constructor(data) {
    super(data);
  }
}
//
export class Transfer extends AbstractOperation {
  //
  get clientShape(/*todo insert flag for source or target*/) {
    return {
      type: this.type,
      from: this.from,
      amount: this.amount,
      // todo use consts
      text: `перевел вам`
    };
  }
  //
  get target() {
    return this.to;
  }
  //
  constructor(data) {
    super(data);
  }
}
//
export class Post extends AbstractOperation {
  //
  get target() {
    const {parent_author} = this;
    // comment only, new post is not processed for now
    const target = !(parent_author.length === 0) ? parent_author : target;

  }
  //
  constructor(data) {
    super(data);
  }
}


export const map = {
  vote: Vote,
  comment: Comment,
  transfer: Transfer,
  // post_create: PostCreate
};
