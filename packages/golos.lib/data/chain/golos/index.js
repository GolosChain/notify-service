import {EventEmitter} from 'events';
import sniffer from './sniffer';

export default class golosD extends EventEmitter {

  onBlock(block) {
    console.log(`+[${block.index}]`);
  }

  constructor() {
    super();
    console.log('[x] sniffer initialization ...');
    this.sniffer = sniffer({
      url: 'wss://ws.golos.io',
      emitter: this
    });
    this.on('block', this.onBlock);
  }
}
