'use strict';

var OAuthClient = require('./oauth-client');

class FakeWindow {
  constructor() {
    this.callbacks = [];

    this.screen = {
      width: 1024,
      height: 768,
    };


    this.location = 'https://client.hypothes.is/app.html';
    this.open = sinon.spy(href => {
      var win = new FakeWindow;
      win.location = href;
      return win;
    });

    this.setTimeout = window.setTimeout.bind(window);
    this.clearTimeout = window.clearTimeout.bind(window);
  }

  get location() {
    return this.url;
  }

  set location(href) {
    this.url = new URL(href);
  }

  addEventListener(event, callback) {
    this.callbacks.push({event, callback});
  }

  removeEventListener(event, callback) {
    this.callbacks = this.callbacks.filter((cb) =>
      !(cb.event === event && cb.callback === callback)
    );
  }

  trigger(event) {
    this.callbacks.forEach((cb) => {
      if (cb.event === event.type) {
        cb.callback(event);
      }
    });
  }

  sendMessage(data) {
    var evt = new MessageEvent('message', { data });
    this.trigger(evt);
  }
}

describe('sidebar.util.oauth-client', () => {
  var fakeHttp;
  var client;
  var config = {
    clientId: '1234-5678',
    authorizationEndpoint: 'https://annota.te/oauth/authorize',
    tokenEndpoint: 'https://annota.te/api/token',
    revokeEndpoint: 'https://annota.te/oauth/revoke',
  };

  beforeEach(() => {
    fakeHttp = {
      post: sinon.stub(),
    };

    client = new OAuthClient(fakeHttp, config);
  });

  describe('#exchangeAuthCode', () => {
    it('makes a POST request to the authorization endpoint', () => {
      return client.exchangeAuthCode('letmein').then(() => {
        var expectedBody =
          'assertion=a.jwt.token' +
          '&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer';
        assert.calledWith(fakeHttp.post, 'https://hypothes.is/api/token', expectedBody, {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        });
      });
    });

    it('returns the parsed token data', () => {
      return client.exchangeAuthCode('letmein').then(token => {
        assert.deepEqual(token, {
          accessToken: '',
          refreshToken: '',
        });
      });
    });

    it('rejects if the request fails', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.exchangeAuthCode('unknowncode').catch(err => {
        assert.equal(err.message, 'failed');
      });
    });
  });

  describe('#exchangeGrantToken', () => {
    it('makes a POST request to the token endpoint', () => {
      return client.exchangeGrantToken('letmein').then(() => {
        assert.calledWith(fakeHttp.post /* args */);
      });
    });

    it('returns the parsed token data', () => {
      return client.exchangeGrantToken('letmein').then(token => {
        assert.deepEqual(token, {
          accessToken: '',
          refreshToken: '',
        });
      });
    });

    it('rejects if the request fails', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.exchangeGrantToken('unknowntoken').catch(err => {
        assert.equal(err.message, 'failed');
      });
    });
  });

  describe('#refreshToken', () => {
    it('makes a POST request to the token endpoint', () => {
      return client.refreshToken('valid-refresh-token').then(() => {
        var expectedBody =
          'grant_type=refresh_token&refresh_token=valid-refresh-token';

        assert.calledWith(
          fakeHttp.post,
          'https://hypothes.is/api/token',
          expectedBody,
          {headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          });
      });
    });

    it('returns the parsed token data', () => {
      return client.refreshToken('valid-refresh-token').then(token => {
        assert.deepEqual(token, {
          accessToken: '',
          refreshToken: '',
        });
      });
    });

    it('rejects if the request fails', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.exchangeGrantToken('invalid-token').catch(err => {
        assert.equal(err.message, 'failed');
      });
    });
  });

  describe('#revokeToken', () => {
    it('makes a POST request to the revoke endpoint', () => {
      return client.revokeToken('valid-access-token').then(() => {
        var expectedBody = 'token=valid-access-token';
        assert.calledWith(fakeHttp.post, 'https://hypothes.is/oauth/revoke/', expectedBody, {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        });
      });
    });

    it('succeeds if the request succeeds', () => {
      return client.revokeToken('valid-access-token');
    });

    it('rejects if the request fails', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.revokeToken('invalid-token').catch(err => {
        assert.equal(err.message, 'failed');
      });
    });
  });

  describe('#authorize', () => {
    var fakeWindow;

    beforeEach(() => {
      fakeWindow = new FakeWindow;
    });

    it('opens the authorization window at the correct URL', () => {
      return client.authorize(fakeWindow).then(() => {
        var params = {
          client_id: fakeSettings.oauthClientId,
          origin: 'https://client.hypothes.is',
          response_mode: 'web_message',
          response_type: 'code',
          state: 'notrandom',
        };
        var expectedAuthUrl = `${authUrl}?${stringify(params)}`;
        // Check that the auth window was opened and then set to the expected
        // location. The final URL is not passed to `window.open` to work around
        // a pop-up blocker issue.
        assert.calledWith(
          fakeWindow.open,
          'about:blank',
          'Login to Hypothesis',
          'height=430,left=274.5,top=169,width=475'
        );
        var authPopup = fakeWindow.open.returnValues[0];
        assert.equal(authPopup.location.href, expectedAuthUrl);

      });
    });

    it('ignores auth responses if the state does not match', () => {
      var loggedIn = false;

      auth.login().then(() => {
        loggedIn = true;
      });

      fakeWindow.sendMessage({
        // Successful response with wrong state
        type: 'authorization_response',
        code: 'acode',
        state: 'wrongstate',
      });

      return Promise.resolve().then(() => {
        assert.isFalse(loggedIn);
      });

    });

    it('resolves the Promise when the auth code is returned', () => {
      return client.authorize(fakeWindow).then(code => {
        assert.equal(code, 'expected-code');
      });
    });

    it('rejects if authorization is canceled', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.authorize(fakeWindow).catch(err => {
        assert.equal(err.message, 'foo');
      });
    });
  });
});
