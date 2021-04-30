/**
 * @typedef {'guest'|'notebook'} ClientRole
 */

/**
 * SidebarConnector sets up message channels between the sidebar and other
 * frames in the application.
 *
 * New connections between the sidebar and other frames can be established either
 * by the sending frame sending a message to the current frame (the `SidebarConnector`)
 * frame.
 */
export class SidebarConnector {
  /**
   * @param {Window} sidebarFrame
   * @param {Window} selfFrame
   */
  constructor(sidebarFrame, selfFrame = window) {
    this.sidebarFrame = sidebarFrame;
    this.selfFrame = selfFrame;
    this._sidebarOrigin = '*'; // TODO - Set real origin

    /** @param {MessageEvent} event */
    this._onmessage = event => this._handleMessage(event);
    this.selfFrame.addEventListener('message', this._onmessage);
  }

  destroy() {
    this.selfFrame.removeEventListener('message', this._onmessage);
  }

  /**
   * Establish a connection between the current frame and the sidebar.
   *
   * @param {ClientRole} role
   * @return {MessagePort}
   */
  connect(role) {
    return this._connect(window, window.origin, role);
  }

  /**
   * Establish a connection between `frame` and the sidebar.
   *
   * Returns a port that can be used to send messages to the sidebar.
   *
   * @param {Window} frame
   * @param {string} origin
   * @param {ClientRole} role
   * @return {MessagePort}
   */
  _connect(frame, origin, role) {
    const channel = new MessageChannel();
    this.sidebarFrame.postMessage(
      {
        type: 'sidebarConnection',
        role,
      },
      this._sidebarOrigin,
      [channel.port1]
    );

    frame.postMessage(
      {
        type: 'sidebarConnection',
      },
      origin,
      [channel.port2]
    );
    return channel.port2;
  }

  /** @param {MessageEvent} event */
  _handleMessage(event) {
    if (event.source && event.data.type === 'requestSidebarConnection') {
      this._connect(
        /** @type {Window} */ (event.source),
        event.origin,
        'guest'
      );
    }
  }

  /**
   * Request a connection to the sidebar from the host frame.
   *
   * @param {Window} hostFrame - The host frame which has a reference to the sidebar
   * @param {string} hostOrigin - The expected origin of the host frame
   * @param {ClientRole} role - The role of the frame requesting a connection
   * @return {Promise<MessagePort>} - A port that can be used to communicate with
   *   the sidebar. This can be passed to the `SidebarConnection` constructor to
   *   begin communicating.
   */
  static requestConnection(hostFrame, hostOrigin, role) {
    hostFrame.postMessage(
      {
        type: 'requestSidebarConnection',
        role,
      },
      hostOrigin
    );

    return new Promise(resolve => {
      const listener = event => {
        if (event.data.type !== 'sidebarConnection') {
          return;
        }
        window.removeEventListener('message', listener);
        resolve(event.data.port);
      };

      window.addEventListener('message', listener);
    });
  }
}

// See https://www.jsonrpc.org/specification#error_object
export const ERROR_UNKNOWN_METHOD = -32601;
export const ERROR_METHOD_EXCEPTION = -32000;

/**
 * Represents a connection between the sidebar and another frame in the application
 * using the Channel Messaging API [1].
 *
 * The wire protocol is JSON-RPC [2].
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API
 * [2] https://www.jsonrpc.org
 */
export class SidebarConnection {
  /**
   * @param {MessagePort} port - Port for sending and receiving messages from
   *   the sidebar. This port is created using `SidebarConnector`.
   */
  constructor(port) {
    this._port = port;
    this._sequence = 0;
    this._methods = {};

    port.onmessage = async event => {
      // TODO - Validate message structure and send error response if not valid.
      const { method, params, id } = event.data;
      const handler = this._methods[method];
      if (!handler) {
        this._send({
          id,
          error: {
            code: ERROR_UNKNOWN_METHOD,
            message: `Unsupported method "${method}"`,
          },
        });
        return;
      }
      try {
        const result = await handler(...params);
        this._send({
          id,
          result,
        });
      } catch (err) {
        this._send({
          id,
          error: {
            code: ERROR_METHOD_EXCEPTION,
            message: err.message,
          },
        });
      }
    };
  }

  /**
   * Send an RPC request on this connection.
   *
   * @param {string} method
   * @param {any[]} params
   */
  call(method, ...params) {
    ++this._sequence;
    this._send({
      id: this._sequence,
      method,
      params,
    });
  }

  /**
   * Register a handler for a method call on this connection.
   *
   * @param {string} method
   * @param {(...args: any[]) => Promise<any>|any} handler
   */
  on(method, handler) {
    this._methods[method] = handler;
  }

  _send(args) {
    this._port.postMessage({
      jsonrpc: '2.0',
      ...args,
    });
  }
}
