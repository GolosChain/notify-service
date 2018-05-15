import {api, config} from 'golos-js';
// init api once
const {API_GOLOS_URL} = process.env;
// config golos-js
if (API_GOLOS_URL) {
  config.set('websocket', API_GOLOS_URL);
}
// inherit from this to make a configured 'chain' member available in descendant
export default class GolosApi {
  constructor() {
    this.chain = api;
  }
}
