/* global process */

import * as redux from 'redux';
import thunk from 'redux-thunk';

import immutable from '../util/immutable';

import { createReducer, bindSelectors } from './util';

/**
 * Helper that removes the first argument from a function type.
 *
 * @template F
 * @typedef {F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never} OmitFirstArg
 */

/**
 * Helper that removes the first argument from each method in an object.
 *
 * @template T
 * @typedef {{ [K in keyof T]: OmitFirstArg<T[K]> }} OmitFirstArgFromMethods
 */

/**
 * Map of action name to reducer function.
 *
 * @template State
 * @typedef {{ [action: string]: (s: State, action: any) => Partial<State> }} Reducers
 */

/**
 * Configuration for a store module.
 *
 * @template State
 * @template {object} Actions
 * @template {object} Selectors
 * @template {object} RootSelectors
 * @typedef Module
 * @prop {(...args: any[]) => State} init -
 *   Function that returns the initial state for the module
 * @prop {string} namespace -
 *   The key under which this module's state will live in the store's root state
 * @prop {Reducers<State>} update -
 *   Map of action types to "reducer" functions that process an action and return
 *   the changes to the state
 * @prop {Actions} actions
 *   Object containing action creator functions
 * @prop {Selectors} selectors
 *   Object containing selector functions
 * @prop {RootSelectors} [rootSelectors]
 */

/**
 * Replace a type `T` with `Fallback` if `T` is `any`.
 *
 * Based on https://stackoverflow.com/a/61626123/434243.
 *
 * @template T
 * @template Fallback
 * @typedef {0 extends (1 & T) ? Fallback : T} DefaultIfAny
 */

/**
 * Helper for getting the type of store produced by `createStore` when
 * passed a given module.
 *
 * To get the type for a store created from several modules, use `&`:
 *
 * `StoreFromModule<firstModule> & StoreFromModule<secondModule>`
 *
 * @template T
 * @typedef {T extends Module<any, infer Actions, infer Selectors, infer RootSelectors> ?
 *   Store<Actions,Selectors,DefaultIfAny<RootSelectors,{}>> : never} StoreFromModule
 */

/**
 * Redux store augmented with selector methods to query specific state and
 * action methods that dispatch specific actions.
 *
 * @template {object} Actions
 * @template {object} Selectors
 * @template {object} RootSelectors
 * @typedef {redux.Store &
 *   Actions &
 *   OmitFirstArgFromMethods<Selectors> &
 *   OmitFirstArgFromMethods<RootSelectors>} Store
 */

/**
 * Create a Redux store from a set of modules.
 *
 * Each module defines the logic related to a particular piece of the application
 * state. Modules are typically defined with the `createStoreModule` helper and
 * include:
 *
 *  - The initial value of a module's state
 *  - The _actions_ that can change the module's state
 *  - The _selectors_ for accessing a module's state
 *
 * In addition to the standard Redux store interface, the returned store also exposes
 * each action and selector from the input modules as a method. For example, if
 * a store is created from a module that has a `getWidget(<id>)` selector and
 * an `addWidget(<object>)` action, a consumer would use `store.getWidget(<id>)`
 * to fetch an item and `store.addWidget(<object>)` to dispatch an action that
 * adds an item. External consumers of the store should in most cases use these
 * selector and action methods rather than `getState` or `dispatch`. This
 * makes it easier to refactor the internal state structure.
 *
 * Preact UI components access stores via the `useStoreProxy` hook defined in
 * `use-store.js`. This returns a proxy which enables UI components to observe
 * what store state a component depends upon and re-render when it changes.
 *
 * @param {Module<any,any,any,any>[]} modules
 * @param {any[]} [initArgs] - Arguments to pass to each state module's `init` function
 * @param {any[]} [middleware] - List of additional Redux middlewares to use
 * @return Store<any,any,any>
 */
export function createStore(modules, initArgs = [], middleware = []) {
  // Create the initial state and state update function.

  // Namespaced objects for initial states.
  const initialState = {};

  /**
   * Namespaced reducers from each module.
   * @type {import("redux").ReducersMapObject} allReducers
   */
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
        rootSelectors: module.rootSelectors || {},
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

  // Create the combined reducer from the reducers for each module.
  let reducer = redux.combineReducers(allReducers);

  // In debug builds, freeze the new state after each action to catch any attempts
  // to mutate it, which indicates a bug since it is supposed to be immutable.
  if (process.env.NODE_ENV !== 'production') {
    const originalReducer = reducer;
    reducer = (state, action) => immutable(originalReducer(state, action));
  }

  // Create the store.
  const store = redux.createStore(reducer, initialState, enhancer);

  // Add actions and selectors as methods to the store.
  const actions = Object.assign({}, ...modules.map(m => m.actions));
  const boundActions = redux.bindActionCreators(actions, store.dispatch);
  const boundSelectors = bindSelectors(allSelectors, store.getState);

  Object.assign(store, boundActions, boundSelectors);

  return store;
}

/**
 * Helper to validate a store module configuration before it is passed to
 * `createStore`.
 *
 * @template State
 * @template Actions
 * @template Selectors
 * @template RootSelectors
 * @param {Module<State,Actions,Selectors,RootSelectors>} config
 * @return {Module<State,Actions,Selectors,RootSelectors>}
 */
export function storeModule(config) {
  // This helper doesn't currently do anything at runtime. It does ensure more
  // helpful error messages when typechecking if there is something incorrect
  // in the configuration.
  return config;
}

/**
 * @template S
 * @typedef {{ [method: string]: (state: Readonly<S>, ...args: any[]) => Partial<S> }} Actions
 */

/**
 * @template S
 * @typedef {{ [method: string]: (state: Readonly<S>, ...args: any[]) => any }} Selectors
 */

/**
 * @template {Record<string, Function>} Actions
 * @param {string} namespace
 * @param {Actions} actions
 * @return {OmitFirstArgFromMethods<Actions>}
 */
function makeActionCreators(namespace, actions) {
  const creators = {};
  Object.keys(actions).forEach(name => {
    creators[name] = (...args) => {
      return {
        type: `${namespace}/${name}`,
        payload: args,
      };
    };
  });
  return /** @type {OmitFirstArgFromMethods<Actions>} */ (creators);
}

/**
 * @param {string} namespace
 * @param {Record<string, Function>} actions
 */
function makeReducers(namespace, actions) {
  const reducers = {};
  Object.keys(actions).forEach(name => {
    const actionType = `${namespace}/${name}`;
    reducers[actionType] = (state, action) => {
      if (!Array.isArray(action.payload)) {
        // Action creators created by `makeActionCreators` always set the `payload`
        // field, so this error indicates an action created via some other method.
        throw new Error(
          `Action "${actionType}" has a missing or non-array "payload" field`
        );
      }
      return actions[name](state, ...action.payload);
    };
  });
  return reducers;
}

/**
 * Create a store module for use with `createStore`.
 *
 * A store module consists of state related to some aspect of the application,
 * actions that specify how that state can evolve and selectors that enable
 * code outside the module to access the state.
 *
 * When a store is created from modules using `createStore`, the action and
 * selector methods are exposed as methods of the store, except that the
 * `state` argument does not need to be passed when calling the methods.
 * The current module state is automatically passed instead.
 *
 * @template {object} State
 * @template {Selectors<State>} SelectorMap
 * @template {Actions<State>} ActionMap
 * @template {Record<string,Function>} ActionCreators
 * @template {Record<string,Function>} RootSelectors
 * @template {Actions<State>} ReducerMap
 * @param {State|(() => State)} initialState - Initial state of the store. This argument is
 *   separate from `config` to allow the type of the `state` argument of
 *   selector methods and actions in `config` to be automatically inferred.
 * @param {object} config
 *   @param {string} config.namespace -
 *     The key under which this module's state is stored in the root state and
 *     the prefix used for actions dispatched by this module.
 *   @param {SelectorMap} config.selectors -
 *     Object defining selector functions that read from this module's state.
 *     Each function receives the module's state and zero or more arguments and
 *     returns the extracted data.
 *   @param {ActionMap} config.actions -
 *     Object defining actions that update the module's state. Each function
 *     receives the current module state and zero or more arguments for the
 *     action. The function returns the updates to the module state.
 *   @param {ActionCreators} [config.actionCreators] -
 *   @param {RootSelectors} [config.rootSelectors] -
 *     Selectors that operate over state from multiple modules. These behave
 *     similarly to `selectors` except that they receive the root store state
 *     as the first argument.
 *   @param {ReducerMap} [config.reducers] -
 *     Additional reducer functions. These allow this module's state to be
 *     updated in response to actions from other modules.
 */
export function createStoreModule(initialState, config) {
  const {
    actions,
    namespace,
    selectors,

    // Optional config. Type casts are needed here so that the types, if specified,
    // are not "erased" to just `{}`.
    actionCreators = /** @type {ActionCreators} */ ({}),
    reducers = /** @type {Reducers<State>} */ ({}),
    rootSelectors,
  } = config;

  const init =
    initialState instanceof Function ? initialState : () => initialState;

  return storeModule({
    namespace,
    init,

    // The properties of `update` are internal to the store, so the type
    // doesn't matter.
    // @ts-ignore
    update: { ...reducers, ...makeReducers(namespace, actions) },

    actions: { ...actionCreators, ...makeActionCreators(namespace, actions) },
    selectors,
    rootSelectors,
  });
}
