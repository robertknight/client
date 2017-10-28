'use strict';

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
    // TODO - Reset focused group if user leaves.
    // TODO - Set focused group when groups are fetched.

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
 * Return the user's profile.
 *
 * Returns the current user's profile fetched from the `/api/profile` endpoint.
 */
function profile(state) {
  return state.session;
}

function getGroup(state, id) {
  return state.session.groups.find(g => g.id === id);
}

function allGroups(state) {
  return state.session.groups;
}

module.exports = {
  init,
  update,

  actions: {
    updateSession,
  },

  selectors: {
    allGroups,
    getGroup,
    isFeatureEnabled,
    profile,
  },
};
