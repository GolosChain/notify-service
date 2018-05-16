/* eslint-disable quotes */
import GolosApi from 'chain/golos/api';

export default class AbstractNotification extends GolosApi {
  // @abstract
  // the place to fetch more data if needed
  async compose() {
    return null;
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
  //
  get target() {
    return null;
  }
}
