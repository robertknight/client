'use strict';

/**
 * This module defines the main update function (or 'reducer' in Redux's
 * terminology) that handles app state updates. For an overview of how state
 * management in Redux works, see the comments at the top of `annotation-ui.js`
 *
 * Each sub-module in this folder defines:
 *
 *  - An `init` function that returns the initial state relating to some aspect
 *    of the application
 *  - An `update` object mapping action types to a state update function for
 *    that action
 *  - A set of action creators - functions that return actions that can then
 *    be passed to `store.dispatch()`
 *  - A set of selectors - Utility functions that calculate some derived data
 *    from the state
 */

var annotations = require('./annotations');
var drafts = require('./drafts');
var frames = require('./frames');
var links = require('./links');
var realtimeUpdates = require('./realtime-updates');
var selection = require('./selection');
var session = require('./session');
var viewer = require('./viewer');
var util = require('./util');

var modules = {
  annotations,
  drafts,
  frames,
  links,
  realtimeUpdates,
  selection,
  session,
  viewer,
};

/**
 * Combine the initial state from the various state modules.
 */
function init(settings) {
  var state = {};
  Object.entries(modules).forEach(([name, module]) => {
    if (module.isModule) {
      // This state module's init() function returns only the state for that
      // module.
      Object.assign(state, { [name]: module.init(settings) });
    } else {
      Object.assign(state, module.init(settings));
    }
  });
  return state;
}

/**
 * Convert update functions from a state module to operate on the root state
 * rather than local state.
 */
function rootUpdateFns(name, localUpdateFns) {
  var result = {};
  Object.entries(localUpdateFns).forEach(([actionType, localUpdateFn]) => {
    var rootUpdateFn = (state, action) => ({
      [name]: localUpdateFn(state[name], action),
    });
    result[actionType] = rootUpdateFn;
  });
  return result;
}

var updateFns = Object.keys(modules).map(name => {
  var module = modules[name];
  return module.isModule ? rootUpdateFns(name, module.update) : module.update;
});

/**
 * Convert selectors from a state module to take root state rather than local
 * state.
 */
function rootSelectors(name, localSelectors) {
  var result = {};
  Object.entries(localSelectors).forEach(([selectorName, localSelector]) => {
    var rootSelector = (state, ...args) => {
      var context = { state: state[name], rootState: state };
      return localSelector(context, ...args);
    };
    result[selectorName] = rootSelector;
  });
  return result;
}

var selectorFns = Object.keys(modules).map(name => {
  var module = modules[name];
  return module.isModule ? rootSelectors(name, module.selectors) : module.selectors;
});

var update = util.createReducer(...updateFns);
var actions = Object.assign({}, ...Object.values(modules).map(m => m.actions));
var selectors = Object.assign({}, ...selectorFns);

module.exports = {
  init,
  update,
  actions,
  selectors,
};
