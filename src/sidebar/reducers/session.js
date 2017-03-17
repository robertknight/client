'use strict';

var parseAccountID = require('../filter/persona').parseAccountID;
var memoize = require('../util/memoize');
var util = require('./util');

function init() {
  return {
    /**
     * The state of the user's login session.
     *
     * This includes their user ID, set of enabled features, and the list of
     * groups they are a member of.
     */
    session: {
      /**
       * The CSRF token for requests to API endpoints that use cookie
       * authentication.
       */
      csrf: null,

      /** A map of features that are enabled for the current user. */
      features: {},
      /** List of groups that the current user is a member of. */
      groups: [],
      /**
       * The authenticated user ID or null if the user is not logged in.
       */
      userid: null,
    },
  };
}

var update = {
  UPDATE_SESSION: function (state, action) {
    return {
      session: action.session,
    };
  },
};

var actions = util.actionTypes(update);

/**
 * Update the session state.
 */
function updateSession(session) {
  return {
    type: actions.UPDATE_SESSION,
    session: session,
  };
}

/**
 * Return true if a given feature flag is enabled.
 *
 * @param {object} state - The application state
 * @param {string} feature - The name of the feature flag. This matches the
 *        name of the feature flag as declared in the Hypothesis service.
 */
function isFeatureEnabled(state, feature) {
  return !!state.session.features[feature];
}

/**
 * @typedef AuthStatus
 * @property {'unknown'|'logged-in'|'logged-out'} status
 * @property {string?} userid - The full userid of the logged-in user
 * @property {string?} username - The username part of the userid
 * @property {string?} provider - The domain which 'owns' the username
 */

/**
 * Return the authentication status of the user.
 *
 * @return {AuthStatus}
 */
function authStatus(state) {
  // Check for the groups list being empty as a way to test whether the profile
  // information has even been fetched or not.
  if (state.session.groups.length === 0) {
    return {status: 'unknown'};
  }

  var userid = state.session.userid;
  if (userid) {
    var parsed = parseAccountID(userid);
    return {
      status: 'logged-in',
      userid: userid,
      username: parsed.username,
      provider: parsed.provider,
    };
  } else {
    return {status: 'logged-out'};
  }
}

module.exports = {
  init: init,
  update: update,

  actions: {
    updateSession: updateSession,
  },

  // Selectors

  // Memoized so that `authStatus` returns the same object for each call if the
  // session is unchanged.
  authStatus: memoize(authStatus),
  isFeatureEnabled: isFeatureEnabled,
};
