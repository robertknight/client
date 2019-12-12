'use strict';

const redux = require('redux');
const shallowEqual = require('shallowequal');
// `.default` is needed because 'redux-thunk' is built as an ES2015 module
const thunk = require('redux-thunk').default;

const { createReducer, bindSelectors } = require('./util');

/**
 * Create a Redux store from a set of _modules_.
 *
 * Each module defines the logic related to a particular piece of the application
 * state, including:
 *
 *  - The initial value of that state
 *  - The _actions_ that can change that state
 *  - The _selectors_ for reading that state or computing things
 *    from that state.
 *
 * On top of the standard Redux store methods, the returned store also exposes
 * each action and selector from the input modules as a method which operates on
 * the store.
 *
 * @param {Object[]} modules
 * @param {any[]} initArgs - Arguments to pass to each state module's `init` function
 * @param [any[]] middleware - List of additional Redux middlewares to use.
 */
function createStore(modules, initArgs = [], middleware = []) {
  // Create the initial state and state update function.

  // Namespaced objects for initial states.
  const initialState = {};
  // Namespaced reducers from each module.
  const allReducers = {};
  // Namespaced selectors from each module.
  const allSelectors = {};

  // Iterate over each module and prep each module's:
  //    1. state
  //    2. reducers
  //    3. selectors
  //
  modules.forEach(module => {
    if (module.namespace) {
      initialState[module.namespace] = module.init(...initArgs);

      allReducers[module.namespace] = createReducer(module.update);
      allSelectors[module.namespace] = {
        selectors: module.selectors,
      };
    } else {
      console.warn('Store module does not specify a namespace', module);
    }
  });

  const defaultMiddleware = [
    // The `thunk` middleware handles actions which are functions.
    // This is used to implement actions which have side effects or are
    // asynchronous (see https://github.com/gaearon/redux-thunk#motivation)
    thunk,
  ];
  const enhancer = redux.applyMiddleware(...defaultMiddleware, ...middleware);

  // Create the store.
  const store = redux.createStore(
    redux.combineReducers(allReducers),
    initialState,
    enhancer
  );

  // Add actions and selectors as methods to the store.
  const actions = Object.assign({}, ...modules.map(m => m.actions));
  const boundActions = redux.bindActionCreators(actions, store.dispatch);
  const boundSelectors = bindSelectors(allSelectors, store.getState);

  Object.assign(store, boundActions, boundSelectors);

  /**
   * Watch for changes to state in the store and run a callback when it changes.
   *
   * The `callback` function is run immediately with the initial results of
   * `selector` as soon as `watch` is called.
   *
   * @param {() => any} selector -
   *   Function that selects state from the store. The resulting value is
   *   shallow-compared with the previous result and it is passed to the callback
   *   if it changed.
   * @param ((current: any, previous: any) => any} -
   *   Callback that receives the current and previous values of `selector`.
   * @return {() => void} - Function that unsubscribes from updates
   */
  store.watch = (selector, callback) => {
    let prevResult = selector();
    callback(prevResult, undefined);
    const unsubscribe = store.subscribe(() => {
      const newResult = selector();
      if (shallowEqual(prevResult, newResult)) {
        return;
      }
      const savedPrevResult = prevResult;
      prevResult = newResult;
      callback(newResult, savedPrevResult);
    });
    return unsubscribe;
  };

  return store;
}

module.exports = createStore;
