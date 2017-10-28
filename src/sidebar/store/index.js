'use strict';

/**
 * Central store of state for the sidebar application, managed using
 * [Redux](http://redux.js.org/).
 *
 * This is in effect the application's local in-memory "database".
 *
 * State management in Redux apps work as follows:
 *
 *  1. All important application state is stored in a single, immutable object.
 *  2. The user interface is a presentation of this state. Interaction with the
 *     UI triggers updates by creating `actions`.
 *  3. Actions are plain JS objects which describe some event that happened in
 *     the application. Updates happen by passing actions to a `reducer`
 *     function which takes the current application state, the action and
 *     returns the new application state.
 *
 *     The process of updating the app state using an action is known as
 *     'dispatching' the action.
 *  4. Other parts of the app can subscribe to changes in the app state.
 *     This is used to to update the UI etc.
 *
 * "middleware" functions can wrap the dispatch process in order to implement
 *  logging, trigger side effects etc.
 *
 * Tests for a given action consist of:
 *
 *  1. Checking that the UI (or other event source) dispatches the correct
 *     action when something happens.
 *  2. Checking that given an initial state, and an action, a reducer returns
 *     the correct resulting state.
 *  3. Checking that the UI correctly presents a given state.
 */

var redux = require('redux');

// `.default` is needed because 'redux-thunk' is built as an ES2015 module
var thunk = require('redux-thunk').default;

var { init, update, actions, selectors } = require('./modules');
var { bindSelectors } = require('./modules/util');

var debugMiddleware = require('./modules/debug-middleware');

/**
 * Redux middleware which triggers an Angular change-detection cycle
 * if no cycle is currently in progress.
 *
 * This ensures that Angular UI components are updated after the UI
 * state changes in response to external inputs (eg. WebSocket messages,
 * messages arriving from other frames in the page, async network responses).
 *
 * See http://redux.js.org/docs/advanced/Middleware.html
 */
function angularDigestMiddleware($rootScope) {
  return function (next) {
    return function (action) {
      next(action);

      // '$$phase' is set if Angular is in the middle of a digest cycle already
      if (!$rootScope.$$phase) {
        // $applyAsync() is similar to $apply() but provides debouncing.
        // See http://stackoverflow.com/questions/30789177
        $rootScope.$applyAsync(function () {});
      }
    };
  };
}

/**
 * Factory function that creates a store for app state.
 */
// @ngInject
function createStore($rootScope, settings) {
  var enhancer = redux.applyMiddleware(
    // The `thunk` middleware handles actions which are functions.
    // This is used to implement actions which have side effects or are
    // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
    thunk,
    debugMiddleware,
    angularDigestMiddleware.bind(null, $rootScope)
  );
  var store = redux.createStore(update, init(settings), enhancer);

  /**
   * Convenience method for triggering reactions in response to changes in
   * the application state.
   *
   * This is conceptually very similar to Angular's `$watch` on scopes.
   *
   * @param {Function} valueFn - 'Cheap' function that computes some value from
   * the app state.
   * @param {Function} callback - Function that is called with the current and
   * previous results of `valueFn` when the result changes.
   * @return {Function} - Function that removes the listener.
   */
  store.watch = (valueFn, callback) => {
    var prevValue;
    var unsubscribe = store.subscribe(() => {
      var currentValue = valueFn(store.getState());
      if (currentValue === prevValue) {
        return;
      }
      callback(currentValue, prevValue);
      prevValue = currentValue;
    });
    return unsubscribe;
  };

  // Expose each action as a method of the store which implicitly calls
  // `store.dispatch` with the resulting action object.
  var boundActions = redux.bindActionCreators(actions, store.dispatch);

  // Expose each selector as a method of the store which implicitly receives the
  // current state as the first argument.
  var boundSelectors = bindSelectors(selectors, store.getState);

  return Object.assign(store, boundActions, boundSelectors);
}

module.exports = {
  createStore,
};
