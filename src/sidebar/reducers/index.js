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
var realtimeUpdates = require('./realtimeUpdates');
var selection = require('./selection');
var session = require('./session');
var viewer = require('./viewer');
var util = require('./util');

var modules = [
  annotations,
  drafts,
  frames,
  links,
  realtimeUpdates,
  selection,
  session,
  viewer,
];

function init(settings) {
  return Object.assign(...modules.map(m => m.init(settings)));
}

var update = util.createReducer(Object.assign({}, ...modules.map(m => m.update)));
var actions = Object.assign({}, ...modules.map(m => m.actions));
var selectors = Object.assign({}, ...modules.map(m => m.selectors));

module.exports = {
  init,
  update,
  actions,
  selectors,
};
