import {EventEmitter} from 'events';
import sniffer from './sniffer'

export default class golosD extends EventEmitter {
  constructor() {
    super();
    console.log(`[x] sniffer initialization ...`)
    this.sniffer = sniffer({url: 'wss://ws.golos.io'});
  }
}
