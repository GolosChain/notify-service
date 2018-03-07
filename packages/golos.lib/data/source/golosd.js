import BaseDataSource from './base';
import PersistentWebSocket from './transport/ws/persistent';

export default class GolosDataSource extends BaseDataSource {

  transport;

  constructor(uri) {
    super(uri);
    this.transport = new PersistentWebSocket(this.href);
    PersistentWebSocket.debugAll = true;
  }

}
