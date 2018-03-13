import BaseDataSource from './base';
import PersistentWebSocket from '../transport/WebSocket/Persistent';
import { Observable } from 'rxjs';

// final
export default class Golos {
  socket = new PersistentWebSocket('wss://ws.golos.io');
  streams = {
    open: Observable.fromEvent(this.socket, 'open'),
    message: Observable.fromEvent(this.socket, 'message'),
    block: Observable.fromEvent(this.socket, 'message')
      .map(dataEvent => JSON.parse(dataEvent.data))
    // todo: this gracefully restarts the stream somehow - take a look at the docs
      .filter(data => (data.method === 'notice' && data.params))
      .map(blockData => blockData.params[1][0])
      .map(blockData => ({
        // calculate and add the current block's number (chain head) for convenience
        index: parseInt(blockData.previous.slice(0, 8), 16),
        ...blockData
      }))
      .catch(e => {
        console.log('Error parsing raw data!');
        return Observable.empty();
      })
  }

  constructor() {
    this.streams.open.subscribe(x => {
      console.log('[Golos] >>> set_block_applied_callback');
      this.socket.send(
        JSON.stringify({
          id: 1,
          method: 'call',
          'params': ['database_api', 'set_block_applied_callback', [0]],
        })
      );
    }
    );
  }


}
