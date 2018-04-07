import comment from './type/comment';
import transfer from './type/transfer';
import vote from './type/vote';
//
const implemented = {
  comment,
  // transfer,
  // vote
}
// map chain type to system message type
function fromChain(op) {
  const {type, payload: {
    parent_author
  }} = op;
  //new post and new comment are different events for us
  if (type === 'comment') {
    if (parent_author.length === 0) {
      // no such operation on chain but
      // they need to be separated for further usage
      return 'post';
    }
  }
  //
  return type;
}
// create and return a Message instance according to the passed data
// op expected to be shaped by sniffer
// {block, operations: []}
export default function(op) {
  const type = fromChain(op);
  const MessageConstructor = implemented[type];
  return (MessageConstructor ? new MessageConstructor(op) : null);
}
