import {default as WebSocket} from './';
import {EventEmitter} from 'events';
import {colorConsole} from 'tracer';

const settings = {
  // Whether this instance should log debug messages.
  debug: false,
  // Whether or not the websocket should attempt to connect immediately upon instantiation.
  automaticOpen: true,
  // The number of milliseconds to delay before attempting to reconnect.
  reconnectInterval: 1000,
  // The maximum number of milliseconds to delay a reconnection attempt.
  maxReconnectInterval: 3000,
  // The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist.
  reconnectDecay: 1,
  // The maximum time in milliseconds to wait for a connection to succeed before closing and retrying.
  timeoutInterval: 300,
  // The maximum number of reconnection attempts to make. Unlimited if null.
  maxReconnectAttempts: null,
  // The binary type, possible values 'blob' or 'arraybuffer', default 'blob'.
  binaryType: 'blob'
};

// this should implement the EventEmitter interface to have no pain making it Observable
export default class PersistentWebSocket extends EventEmitter {
  constructor(url, protocols = [], options = {}) {
    if (!WebSocket) {
    // we are in node.js environment and 'ws' module was not installed
      throw new Error('ws module is not installed!');
    }
    super();
    this.logger = colorConsole();
    // Overwrite and define settings with options if they exist.
    for (const key in settings) {
      if (typeof options[key] !== 'undefined') {
        this[key] = options[key];
      } else {
        this[key] = settings[key];
      }
    }
    // The URL as resolved by the constructor. This is always an absolute URL.
    this.url = url;
    // The number of attempted reconnects since starting, or the last successful connection. Read only.
    this.reconnectAttempts = 0;
    // One of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
    this.readyState = WebSocket.CONNECTING;
    // sub-protocol the server selected
    this.protocol = null;
    // Websocket instance
    this.ws = undefined;
    // ?
    this.forcedClose = false;
    // ?
    this.timedOut = false;
    // ?
    this.timeout = setTimeout(
      () => {
        console.log('ReconnectingWebSocket', 'connection-timeout', this.url);
        this.timedOut = true;
        this.ws.close();
        this.timedOut = false;
      },
      this.timeoutInterval
    );
    // Whether or not to connect upon instantiation
    if (this.automaticOpen) {
      this.open(false);
    }
    // this.logger.info('leaving constructor');
  }

  onerror(e) {
    // this.logger.error(e.message);
  }

  open(reconnectAttempt) {
    this.ws = new WebSocket(this.url, this.protocols);
    this.ws.binaryType = this.binaryType;
    if (reconnectAttempt) {
      if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
        return;
      }
    } else {
      this.emit('connecting');
      this.reconnectAttempts = 0;
    }

    // this.logger.info('set this.ws.onopen');
    this.ws.onopen = event => {
      // this.logger.trace('- this.ws.onopen');
      clearTimeout(this.timeout);
      this.protocol = this.ws.protocol;
      this.readyState = WebSocket.OPEN;
      this.reconnectAttempts = 0;
      // this.logger.trace(`this.protocol : ${this.protocol}`);
      // this.logger.trace(`this.readyState : ${this.readyState}`);
      // this.logger.trace(`this.reconnectAttempts : ${this.reconnectAttempts}`);
      this.emit('open', {
        protocol: this.protocol,
        reconnectAttempts: this.reconnectAttempts,
        reconnectAttempt
      });
      reconnectAttempt = false;
    };
    // this.logger.info('set this.ws.onclose');
    this.ws.onclose = event => {
      clearTimeout(this.timeout);
      this.ws = null;
      if (this.forcedClose) {
        this.readyState = WebSocket.CLOSED;
        this.emit('close');
      } else {
        this.readyState = WebSocket.CONNECTING;
        // const e = generateEvent('connecting');
        // e.code = event.code;
        // e.reason = event.reason;
        // e.wasClean = event.wasClean;
        // eventTarget.dispatchEvent(e);
        if (!reconnectAttempt && !this.timedOut) {
          // console.log('ReconnectingWebSocket', 'onclose', this.url);
          // eventTarget.dispatchEvent(generateEvent('close'));
          this.emit('close');
        }

        const timeout = this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts);

        // console.log(this.reconnectAttempts);

        // console.log(`[timeout] ${timeout > this.maxReconnectInterval ? this.maxReconnectInterval : timeout}`);

        console.log('\\');


        setTimeout(() => {
          this.reconnectAttempts++;
          this.open(true);
        },
                   timeout > this.maxReconnectInterval ? this.maxReconnectInterval : timeout);
      }
    };
    // this.logger.info('set this.ws.onerror');
    this.ws.onerror = event => {
      // eventTarget.dispatchEvent(generateEvent('error'));
      // this.emit('error', event);
      this.onerror(event);
    };
    // this.logger.info('set this.ws.onmessage');
    this.ws.onmessage = event => {
      // console.debug('ReconnectingWebSocket', 'onmessage', self.url, event.data);
      // const e = generateEvent('message');
      // e.data = event.data;
      // eventTarget.dispatchEvent(e);
      this.emit('message', event);
    };

  }

  send(data) {
    if (this.ws) {
      // if (self.debug || ReconnectingWebSocket.debugAll) {
      // console.log('ReconnectingWebSocket', 'send', this.url, data);
      // }
      return this.ws.send(data);
    } else {
      throw new Error('INVALID_STATE_ERR : Pausing to reconnect websocket');
    }
  }


}
