import {default as WebSocket} from './';
import {EventEmitter} from 'events';
// export declare type EventTargetLike = EventTarget | NodeStyleEventEmitter ...

// interface EventTarget {
//   addEventListener(type: string, listener?: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
//   dispatchEvent(evt: Event): boolean;
//   removeEventListener(type: string, listener?: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
// }
// export type NodeStyleEventEmitter = {
//   addListener: (eventName: string, handler: Function) => void;
// removeListener: (eventName: string, handler: Function) => void;
// };

const settings = {
  /** Whether this instance should log debug messages. */
  debug: false,
  /** Whether or not the websocket should attempt to connect immediately upon instantiation. */
  automaticOpen: true,
  /** The number of milliseconds to delay before attempting to reconnect. */
  reconnectInterval: 1000,
  /** The maximum number of milliseconds to delay a reconnection attempt. */
  maxReconnectInterval: 3000,
  /** The rate of increase of the reconnect delay. Allows reconnect attempts to back off when problems persist. */
  reconnectDecay: 1,
  /** The maximum time in milliseconds to wait for a connection to succeed before closing and retrying. */
  timeoutInterval: 2000,
  /** The maximum number of reconnection attempts to make. Unlimited if null. */
  maxReconnectAttempts: null,
  /** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
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
    // Overwrite and define settings with options if they exist.
    for (const key in settings) {
      if (typeof options[key] !== 'undefined') {
        this[key] = options[key];
      } else {
        this[key] = settings[key];
      }
    }
    // These should be treated as read-only properties
    /** The URL as resolved by the constructor. This is always an absolute URL. Read only. */
    this.url = url;
    /** The number of attempted reconnects since starting, or the last successful connection. Read only. */
    this.reconnectAttempts = 0;
    /**
     * The current state of the connection.
     * Can be one of: WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED
     * Read only.
     */
    this.readyState = WebSocket.CONNECTING;
    /**
     * A string indicating the name of the sub-protocol the server selected; this will be one of
     * the strings specified in the protocols parameter when creating the WebSocket object.
     * Read only.
     */
    this.protocol = null;


    this.ws = null;
    this.forcedClose = false;
    this.timedOut = false;

    this.timeout = setTimeout(
      () => {
        console.log('ReconnectingWebSocket', 'connection-timeout', this.url);
        this.timedOut = true;
        this.ws.close();
        this.timedOut = false;
      },
      this.timeoutInterval
    );

    // Whether or not to create a websocket upon instantiation
    if (this.automaticOpen) {
      this.open(false);
    }
  }


  onerror(e) {

  }

  open(reconnectAttempt) {
    this.ws = new WebSocket(this.url, this.protocols);
    this.ws.binaryType = this.binaryType;
    if (reconnectAttempt) {
      if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
        return;
      }
    } else {
      // eventTarget.dispatchEvent(generateEvent('connecting'));
      this.emit('connecting');
      this.reconnectAttempts = 0;
    }

    console.log('ReconnectingWebSocket', 'attempt-connect', this.url);

    // const localWs = ws;

    this.ws.onopen = event => {
      console.log('ReconnectingWebSocket', 'onopen', this.url);
      clearTimeout(this.timeout);
      this.protocol = this.ws.protocol;
      this.readyState = WebSocket.OPEN;
      this.reconnectAttempts = 0;
      // const e = generateEvent('open');
      // e.isReconnect = reconnectAttempt;
      // reconnectAttempt = false;
      // eventTarget.dispatchEvent(e);
      this.emit('open', reconnectAttempt);
      reconnectAttempt = false;
    };

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
          console.log('ReconnectingWebSocket', 'onclose', this.url);
          // eventTarget.dispatchEvent(generateEvent('close'));
          this.emit('close');
        }

        const timeout = this.reconnectInterval * Math.pow(this.reconnectDecay, this.reconnectAttempts);

        console.log(this.reconnectAttempts);

        console.log(`[timeout] ${timeout > this.maxReconnectInterval ? this.maxReconnectInterval : timeout}`);

        setTimeout(() => {
          this.reconnectAttempts++;
          this.open(true);
        },
                   timeout > this.maxReconnectInterval ? this.maxReconnectInterval : timeout);
      }
    };

    this.ws.onerror = event => {
      console.log('ReconnectingWebSocket', 'onerror', this.url);
      // eventTarget.dispatchEvent(generateEvent('error'));
      // this.emit('error', event);
      this.onerror(event);
    };


    this.ws.onmessage = event => {
      // console.debug('ReconnectingWebSocket', 'onmessage', self.url, event.data);
      // const e = generateEvent('message');
      // e.data = event.data;
      // eventTarget.dispatchEvent(e);
      this.emit('message', event);
    };

  }

  /**
   * Transmits data to the server over the WebSocket connection.
   *
   * @param data a text string, ArrayBuffer or Blob to send to the server.
   */
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
