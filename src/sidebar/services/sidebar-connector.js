/**
 * @typedef {import('./oauth-auth').default} AuthFactory
 * @typedef {ReturnType<AuthFactory>} AuthService
 */

/**
 * @typedef JsonRpcMessage
 * @prop {'2.0'} jsonrpc
 * @prop {string} id
 * @prop {string} method
 * @prop {any[]} params
 */

/**
 * @return {value is JsonRpcMessage}
 */
function isJsonRpcMessage(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof value.id !== 'string' ||
    typeof value.method !== 'string' ||
    !Array.isArray(value.params)
  ) {
    return false;
  }
  return true;
}

/**
 * Service used by the Notebook application to connect to the Sidebar application.
 *
 * This is used to pass information and sync state from the sidebar to the
 * notebook.
 *
 * When the notebook application starts up, it should call the `connect` method
 * on this service to create a pair of `MessagePort`s that are used for the
 * sidebar and notebook to communicate without their messages being observable
 * by the host page. The `SidebarConnectorService` retains one of the ports while the
 * other is transferred to the `NotebookConnectorService` running in the
 * sidebar application.
 */
export class SidebarConnectorService {
  /**
   * @param {AuthService} auth
   */
  // @inject
  constructor(auth) {
    this._auth = auth;

    /** @type {MessagePort|null} */
    this._port = null;

    /**
     * A Promise that is resolved once the sidebar has passed authentication
     * through to the notebook.
     *
     * @type {Promise<void>}
     */
    this.authReceived = new Promise((resolve, reject) => {
      this._resolveAuthReceived = resolve;
      this._rejectAuthReceived = reject;
    });
  }

  connect() {
    const channel = new MessageChannel();
    this._port = channel.port1;
    this._port.onmessage = event => this._handleMessage(event);
    window.parent.postMessage(
      {
        jsonrpc: '2.0',
        method: 'connectNotebook',
      },

      // This message is allowed to be handled by any origin because it is
      // handled by the host page which forwards the port on to the sidebar.
      //
      // The sidebar must check this message's origin when it receives the message.
      '*',

      [channel.port2]
    );
  }

  /**
   * @param {MessageEvent} event
   */
  _handleMessage(event) {
    const data = event.data;
    console.log('SidebarConnectorService received', data);
    if (!isJsonRpcMessage(data)) {
      return;
    }
    switch (data.method) {
      case 'accessToken':
        {
          const token = data.params[0];
          console.log('SidebarConnectorService setting access token', accessToken);
          if (typeof token === 'string') {
            this._auth.setAccessToken(token);
            this._resolveAuthReceived();
          }
        }
        break;
    }
  }
}
