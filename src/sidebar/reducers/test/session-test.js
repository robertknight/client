'use strict';

var session = require('../session');

var util = require('../util');

var init = session.init;
var actions = session.actions;
var update = util.createReducer(session.update);

describe('session reducer', function () {
  describe('#updateSession', function () {
    it('updates the session state', function () {
      var newSession = Object.assign(init(), {userid: 'john'});
      var state = update(init(), actions.updateSession(newSession));
      assert.deepEqual(state.session, newSession);
    });
  });

  describe('#authStatus', function () {
    var DEFAULT_GROUPS = [{id: '__world__'}];

    it('returns an "unknown" status initially', function () {
      assert.deepEqual(session.authStatus(init()), {status: 'unknown'});
    });

    it('returns a "logged-out" status if userid is null', function () {
      var newSession = {
        userid: null,
        groups: DEFAULT_GROUPS,
      };

      var state = update(init(), actions.updateSession(newSession));

      assert.deepEqual(session.authStatus(state), {
        status: 'logged-out',
      });
    });

    it('returns a "logged-in" status if userid is non-null', function () {
      var newSession = Object.assign(init(), {
        userid: 'acct:jim@hypothes.is',
        groups: DEFAULT_GROUPS,
      });

      var state = update(init(), actions.updateSession(newSession));

      assert.deepEqual(session.authStatus(state), {
        status: 'logged-in',
        userid: 'acct:jim@hypothes.is',
        username: 'jim',
        provider: 'hypothes.is',
      });
    });
  });
});
