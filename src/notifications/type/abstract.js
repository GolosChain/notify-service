/* eslint-disable quotes */
import GolosApi from 'chain/golos/api';

export default class AbstractNotification extends GolosApi {
  // @abstract
  // the place to fetch more data if needed
  async compose({opIndex, blockIndex, timestamp}) {
    // fixme it is initially number, but tnt model gets string
    blockIndex = String(blockIndex);
    // generate unique id for this notification
    const id = `${blockIndex}_${opIndex}`;
    Object.assign(this, {id, blockIndex, timestamp});
    // got type, id, blockIndex, timestamp, initial payload here
  }
  //
  async save(driver) {
    const tuple = this.tnt;
    // const [ta, tb, ts, tp, tg] = tuple;
    // console.log(`[${tb}][${ta}] : ${tp} -> ${tg}`);
    const result = await driver.call('notification_add', tuple);
    return result;
  }
  // get additional data here if chain op data is not enough
  constructor(op) {
    //
    super();
    // merge passed data into an instance anyway
    const [type, payload] = op;
    Object.assign(this, {type, ...payload});
    // console.log(this);
  }
}
