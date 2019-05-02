'use strict';

/**
 * This module contains metadata about the Hypothesis API and tokens for
 * accessing the API.
 */

const { DATA_NOT_FETCHED, createSimpleAction } = require('../util');

function init() {
  return {
    api: {
      /**
       * The access token used to make API requests. May be `null` if the user
       * is logged out or a string otherwise.
       */
      accessToken: DATA_NOT_FETCHED,
    },
  };
}

const update = {
  UPDATE_ACCESS_TOKEN(state, { accessToken }) {
    return { api: { ...state.api, accessToken } };
  },
};

module.exports = {
  init,
  update,
  actions: {
    updateAccessToken: createSimpleAction('UPDATE_ACCESS_TOKEN', 'accessToken'),
  },
  selectors: {
    accessToken: state => state.api.accessToken,
  },
};
