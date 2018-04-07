import comment from './type/comment';
import transfer from './type/transfer';
import vote from './type/vote';
//
const implemented = {
  comment,
  transfer,
  // vote
}
// map chain type to system message type
function fromChain(op) {
  const {type, payload: {
    author,
    parent_author,
    from,
    to
  }} = op;
  //new post and new comment are different events for us
  if (type === 'comment') {
    if (parent_author.length === 0) {
      // no such operation on chain but
      // they need to be separated for further usage
      return 'post';
    }
    if (author === parent_author) {
      // no notification for me if commenter is myself
      return null;
    }
  }
  //
  if (type === 'transfer') {
    if (from === to) {
      // no notification if I send money to myself
      return null;
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
  const MessageConstructor = type ? implemented[type] : null;
  return (MessageConstructor ? new MessageConstructor(op) : null);
}
