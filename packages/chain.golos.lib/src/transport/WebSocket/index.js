/* eslint-disable no-undef */
import isNode from 'detect-is-node';

let WS;

try {
  if (isNode) {
    WS = require('ws');
  } else {
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      if (typeof WebSocket !== 'undefined') {
        WS = WebSocket;
      } else if (typeof MozWebSocket !== 'undefined') {
        WS = MozWebSocket;
      } else if (typeof global !== 'undefined') {
        WS = global.WebSocket || global.MozWebSocket;
      } else if (typeof window !== 'undefined') {
        WS = window.WebSocket || window.MozWebSocket;
      } else if (typeof self !== 'undefined') {
        WS = self.WebSocket || self.MozWebSocket;
      }
    }
  }
} catch
(e) {
  console.log('[golos.lib/WebSocket] ws is not installed!');
}

export default WS;
