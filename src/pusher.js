export default class Pusher {
  onBlockComposed = async block => {
    console.log(`| ---------------------------- sending ...`);
    const {index, state} = block;
    let sentTotal = 0;
    for (const target in state) {
      // let {notifications: {untouched_count, list}} = state[target];
      let {notifications: {totals, list}} = state[target];
      // transform into plain objects
      list = list.map(notification => {
        let [
          id,
          blockIndex,
          timestamp,
          type,
          // targetid is known
          ,
          // touched is not needed
          ,
          // string
          payload
        ] = notification.tnt;
        //
        payload = JSON.parse(payload);
        //
        return {
          id, blockIndex, timestamp, type, payload
        };
      });
      //
      const message = {
        notifications: {
          // untouched_count,
          totals,
          list
        }
      };
      //  message is ready to be pushed
      this.exchange.publish(target, message);
      sentTotal += list.length;
      console.log(`| -> ${target} [${totals.all}, ${totals.comment}, ${totals.transfer}, ${totals.upvote}, ${totals.downvote}]`);
    }
    console.log('| >> totally sent : ', sentTotal);
    console.log(`| --------------------------------------------------- | ${index}`);
  }
  //
  constructor(exchange) {
    this.exchange = exchange;
  }
}
