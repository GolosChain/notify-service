// This is an nodejs adoption of https://github.com/joewalnes/reconnecting-websocket/
// works like a charm unlike the most popular friend:
// https://github.com/pladaria/reconnecting-websocket
// TODO implement reconnectDecay!
// TODO make separate debug flag for each event (debugAll is too verbose)
// TODO make this a class

/**
 * This behaves like a WebSocket in every way, except if it fails to connect,
 * or it gets disconnected, it will repeatedly poll until it succesfully connects
 * again.
 *
 * It is API compatible, so when you have:
 *   ws = new WebSocket('ws://....');
 * you can replace with:
 *   ws = new PersistentWebSocket('ws://....');
 *
 * The event stream will typically look like:
 *  onconnecting
 *  onopen
 *  onmessage
 *  onmessage
 *  onclose // lost connection
 *  onconnecting
 *  onopen  // sometime later...
 *  onmessage
 *  onmessage
 *  etc...
 *
 * It is API compatible with the standard WebSocket API.
 *
 * Latest version: https://github.com/joewalnes/reconnecting-websocket/
 * - Joe Walnes
 */

import WebSocket from 'ws';

export default function PersistentWebSocket(url, protocols) {
  protocols = protocols || [];

  // These can be altered by calling code.
  this.debug = false;
  this.reconnectInterval = 1000;
  this.timeoutInterval = 2000;

  const self = this;
  let ws;
  let forcedClose = false;
  let timedOut = false;

  this.url = url;
  this.protocols = protocols;
  this.readyState = WebSocket.CONNECTING;
  this.URL = url; // Public API

  this.onopen = function(event) {
  };

  this.onclose = function(event) {
  };

  this.onconnecting = function(event) {
  };

  this.onmessage = function(event) {
  };

  this.onerror = function(event) {
  };

  function connect(reconnectAttempt) {
    ws = new WebSocket(url, protocols);

    self.onconnecting();
    if (self.debug || PersistentWebSocket.debugAll) {
      console.log('PersistentWebSocket', 'attempt-connect', url);
    }

    const localWs = ws;
    const timeout = setTimeout(() => {
      if (self.debug || PersistentWebSocket.debugAll) {
        console.log('PersistentWebSocket', 'connection-timeout', url);
      }
      timedOut = true;
      localWs.close();
      timedOut = false;
    }, self.timeoutInterval);

    ws.onopen = function(event) {
      clearTimeout(timeout);
      if (self.debug || PersistentWebSocket.debugAll) {
        console.log('PersistentWebSocket', 'onopen', url);
      }
      self.readyState = WebSocket.OPEN;
      reconnectAttempt = false;
      self.onopen(event);
    };

    ws.onclose = function(event) {
      clearTimeout(timeout);
      ws = null;
      if (forcedClose) {
        self.readyState = WebSocket.CLOSED;
        self.onclose(event);
      } else {
        self.readyState = WebSocket.CONNECTING;
        self.onconnecting();
        if (!reconnectAttempt && !timedOut) {
          if (self.debug || PersistentWebSocket.debugAll) {
            console.log('PersistentWebSocket', 'onclose', url);
          }
          self.onclose(event);
        }
        setTimeout(() => {
          connect(true);
        }, self.reconnectInterval);
      }
    };
    ws.onmessage = function(event) {
      if (self.debug || PersistentWebSocket.debugAll) {
        // console.log('PersistentWebSocket', 'onmessage', url, event.data);
      }
      self.onmessage(event);
    };
    ws.onerror = function(event) {
      if (self.debug || PersistentWebSocket.debugAll) {
        console.log('PersistentWebSocket', 'onerror', url, event.message);
      }
      self.onerror(event);
    };
  }
  connect(url);

  this.send = function(data) {
    if (ws) {
      if (self.debug || PersistentWebSocket.debugAll) {
        console.log('PersistentWebSocket', 'send', url, data);
      }
      return ws.send(data);
    } else {
      throw 'INVALID_STATE_ERR : Pausing to reconnect websocket';
    }
  };

  this.close = function() {
    if (ws) {
      forcedClose = true;
      ws.close();
    }
  };

  /**
   * Additional public API method to refresh the connection if still open (close, re-open).
   * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
   */
  this.refresh = function() {
    if (ws) {
      ws.close();
    }
  };
}
// Setting this to true is the equivalent of setting all instances of PersistentWebSocket.debug to true.
PersistentWebSocket.debugAll = false;
