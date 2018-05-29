export default class Pusher {
  onBlockComposed = async block => {
    const {index, state} = block;
    console.log('|---------------------------- ', index)

    for (const target in state) {
      let {notifications: {untouched_count, list}} = state[target];
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
          untouched_count,
          list
        }
      };
      //  message is ready to be pushed
      this.exchange.publish(target, message);
      console.log('----> ', target);
    }
  }
  //
  constructor(exchange) {
    this.exchange = exchange;
  }
}
