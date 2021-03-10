/**
 * @typedef {import('./oauth-auth').default} AuthFactory
 * @typedef {ReturnType<AuthFactory>} AuthService
 */

/**
 * Service for the sidebar to communicate with the notebook application.
 */
export class NotebookConnectorService {
  /**
   * @param {AuthService} auth
   */
  // @inject
  constructor(auth) {
    this._auth = auth;

    /**
     * Port for communicating with the Notebook application.
     *
     * @type {MessagePort|null}
     */
    this._port = null;
    this._nextMessageId = 0;
  }

  /**
   * Send a JSON-RPC message to the notebook.
   *
   * @param {string} method
   * @param {any[]} params
   */
  _sendMessage(method, ...params) {
    if (!this._port) {
      throw new Error('Tried to send a message to the notebook but not connected');
    }

    ++this._nextMessageId;

    this._port.postMessage({
      jsonrpc: '2.0',
      id: this._nextMessageId,
      method,
      params,
    });
  }

  /**
   * @param {string|null} token
   */
  _sendAccessToken(token) {
    this._sendMessage('accessToken', token);
  }

  /**
   * Setup a connection to the notebook application, running in a separate
   * iframe.
   *
   * @param {MessagePort} port
   */
  connect(port) {
    this._port = port;
    this._auth.tokenGetter().then(token => this._sendAccessToken(token));
    this._auth.on('oauthTokensChanged', () => {
      this._auth.tokenGetter().then(token => this._sendAccessToken(token));
    });
  }
}
