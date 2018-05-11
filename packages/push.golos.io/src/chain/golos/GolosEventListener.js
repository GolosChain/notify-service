import {EventEmitter} from 'events';
import PersistentWebSocket from 'transport/WebSocket/Persistent';
import onGolosBlockApplied from './events/onGolosBlockApplied';
import {api as chainApi, config as chainApiConfig} from 'golos-js';
import Block from './entity/GolosBlock';


//
export default class GolosEventListener extends EventEmitter {
  //
  setLocalHead = async block => {

  }
  //
  getLocalHead = async() => {

  }
  //
  onSocketOpen = event => {
    console.log('[x] requesting block application push ...');
    //
    this.socket.send(JSON
      .stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'call',
        'params': ['database_api', 'set_block_applied_callback', [0]]
      }), e => {
      if (e) return console.warn(e);
    });
  }
  //
  onSocketMessage = async event => {
    try {
      console.log('++++++++++++++++')
      const data = JSON.parse(event.data);
      const {id, result} = data;
      const blockApplied = (id === 1 && result);
      if (blockApplied) {
        const block = new Block(result);
        // console.log(block.operations)
        // console.log('------------------------------------------ 1')
        // console.log(block)
        // const _data = await chainApi.getBlock(block.index)
        // const _block = new Block(_data);
        // console.log('------------------------------------------ 2')
        // console.log(_block)



        // console.log(block.index);
      //   const block = await this.composeBlock(data);
      //   // keep current applied block
      //   // todo hRemote hLocal should be refactored!
      //   const hRemote = block.index;
      //   const hLocal = await this.get();
      //   //  process it
      //   this.process({
      //     hRemote,
      //     hLocal,
      //     block
      //   });
      }
    } catch (e) {
      //  do nothing - go to the next message
    } finally {
    }
  }
  //
  initChainApi = ({chainApiAddress}) => {
    chainApiConfig.set('websocket', chainApiAddress);
  }
  //
  constructor({
    // chainApiAddress = 'ws://127.0.0.1:8091',
    chainApiAddress = 'wss://ws.golos.io',
    queueApiAddress = {host: 'localhost', port: 3301}
  } = {}) {
    super();
    // init golos.js
    this.initChainApi({chainApiAddress});
    // implement persistent set_block_applied_callback by ourselves for now
    // since golos-js implementation is kinda a mystery
    // todo implement
    this.socket = new PersistentWebSocket(chainApiAddress);
    this.socket.on('open', this.onSocketOpen);
    this.socket.on('message', this.onSocketMessage);
    // register block application handler
    this.on('block', onGolosBlockApplied);
    // const {API_GOLOS_URL, API_QUEUE_HOST, API_GCM_KEY} = process.env;
    // //

  }
}
