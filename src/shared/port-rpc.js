import { ListenerCollection } from './listener-collection';

/*
  This module was adapted from `index.js` in https://github.com/substack/frame-rpc.

  This software is released under the MIT license:

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
 */

const VERSION = '1.0.0';
const PROTOCOL = 'frame-rpc';

/**
 * Format of messages sent between frames.
 *
 * See https://github.com/substack/frame-rpc#protocol
 *
 * @typedef RequestMessage
 * @prop {any[]} arguments
 * @prop {string} method
 * @prop {PROTOCOL} protocol
 * @prop {number} sequence
 * @prop {VERSION} version
 *
 * @typedef ResponseMessage
 * @prop {any[]} arguments
 * @prop {PROTOCOL} protocol
 * @prop {number} response
 * @prop {VERSION} version
 *
 * @typedef {RequestMessage|ResponseMessage} Message
 *
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * RPC provides remote procedure calls between frames.
 *
 * It uses the Channel Messaging API [1] for inter-frame communication.
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API
 *
 * Code adapted from https://github.com/substack/frame-rpc.
 *
 * @template {string} OnMethods
 * @template {string} CallMethods
 * @implements Destroyable
 */
export class PortRPC {
  /**
   * Create an RPC client for sending and receiving RPC messages.
   *
   * After creating the PortRPC instance, call {@link on} to register handlers
   * for incoming RPC requests on this port, then call {@link connect} to
   * establish a connection to a port.
   *
   * RPC methods can then be invoked using {@link call}.
   *
   * TODO - What happens if an RPC method is invoked before the port is connected?
   */
  constructor() {
    /** @type {MessagePort|null} */
    this._port = null;

    /** @type {Record<string, (...args: any[]) => void>} */
    this._methods = {};

    this._sequence = 1;

    /** @type {Record<number, (...args: any[]) => void>} */
    this._callbacks = {};

    this._listeners = new ListenerCollection();
  }

  /**
   * Register a method handler for incoming RPC requests.
   *
   * @param {OnMethods} method
   * @param {(...args: any[]) => void} handler
   */
  on(method, handler) {
    if (this._port) {
      throw new Error('Cannot add a method handler after a port is connected');
    }
    this._methods[method] = handler;
  }

  /**
   * Connect to a MessagePort and process any queued RPC requests.
   *
   * @param {MessagePort} port
   */
  connect(port) {
    this._port = port;
    this._listeners.add(port, 'message', event =>
      this._handle(/** @type {MessageEvent} */ (event))
    );
    port.start();
  }

  /**
   * Disconnect the RPC channel. After this is invoked no further method calls
   * will be received.
   */
  destroy() {
    this._destroyed = true;
    this._listeners.removeAll();
    this._port?.close();
  }

  /**
   * Send an RPC request to the destination frame.
   *
   * If the final argument in `args` is a function, it is treated as a callback
   * which is invoked with the response.
   *
   * @param {CallMethods} method
   * @param {any[]} args
   */
  call(method, ...args) {
    // TODO - What should happen here if the port is not connected? Buffer
    // method calls until the port is connected?

    if (!this._port || this._destroyed) {
      return;
    }

    const seq = this._sequence++;
    const finalArg = args[args.length - 1];
    if (typeof finalArg === 'function') {
      this._callbacks[seq] = finalArg;
      args = args.slice(0, -1);
    }

    /** @type {RequestMessage} */
    const message = {
      arguments: args,
      method,
      protocol: PROTOCOL,
      sequence: seq,
      version: VERSION,
    };

    this._port.postMessage(message);
  }

  /**
   * Validate message
   *
   * @param {MessageEvent} event
   * @return {null|Message}
   */
  _parseMessage({ data }) {
    if (!data || typeof data !== 'object') {
      return null;
    }
    if (data.protocol !== PROTOCOL) {
      return null;
    }
    if (data.version !== VERSION) {
      return null;
    }
    if (!Array.isArray(data.arguments)) {
      return null;
    }

    return data;
  }

  /**
   * @param {MessageEvent} event
   */
  _handle(event) {
    const msg = this._parseMessage(event);
    const port = this._port;

    if (msg === null || !port) {
      return;
    }

    if ('method' in msg) {
      if (!this._methods.hasOwnProperty(msg.method)) {
        return;
      }

      /** @param {any[]} args */
      const callback = (...args) => {
        /** @type {ResponseMessage} */
        const message = {
          arguments: args,
          protocol: PROTOCOL,
          response: msg.sequence,
          version: VERSION,
        };

        port.postMessage(message);
      };
      this._methods[msg.method](...msg.arguments, callback);
    } else if ('response' in msg) {
      const cb = this._callbacks[msg.response];
      delete this._callbacks[msg.response];
      if (cb) {
        cb(...msg.arguments);
      }
    }
  }
}
