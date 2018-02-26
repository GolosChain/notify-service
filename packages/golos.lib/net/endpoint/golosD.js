import Endpoint from './base';
import PersistentWebSocket from '../websocket/persistent/index';

export default class GolosD extends Endpoint {

  transport;

  connect({callbacks}) {
    this.transport = new PersistentWebSocket(this.href);
    this.transport.debugAll = true;
    for (const callback in callbacks) {
      this.transport[`on${callback}`] = callbacks[callback];
    }
  }


}
