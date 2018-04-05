/* eslint-disable quotes */
// abstract Message
// see input shape under the class
export class Message {
  // @abstract
  // the place to fetch more data if needed
  async compose() {
    return null;
  }
  // get additional data here if chain op data is not enough
  constructor(op) {
    // merge passed data into an instance anyway
    this.op = op;
  }
  // there must always be a type in chainOp
  get type() {
    return null;
  }
  //
  get source() {
    return null;
  }
  //
  get target() {
    return this.op.to;
  }
  // returns object shaped for client usage
  // @abstract
  get message() {
    return null;
  }
}
//
// const op = {
//   trx_id: undefined,
//   block: undefined,
//   type: 'comment',
//   payload:
//     { parent_author: 'a153048',
//       parent_permlink: 'a153048-post7',
//       author: 'c153048',
//       permlink: 're-a153048-a153048-post7-20180405t175439957z',
//       title: '',
//       body: 'Com8',
//       json_metadata: '{"tags":["sdfdsf"],"app":"golos.io/0.1"}'
//     }
// };
