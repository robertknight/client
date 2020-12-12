/**
 * @template F
 * @typedef {F extends (x: any, ...args: infer P) => infer R ? (...args: P) => R : never} OmitFirstArg
 */

/**
 * @template Selectors
 * @typedef {{ [K in keyof Selectors]: OmitFirstArg<Selectors[K]> }} SelectorMethods
 */

/**
 * @template Actions
 * @typedef {{ [K in keyof Actions]: Actions[K] }} ActionMethods
 */

/**
 * @template State
 * @typedef {{ [action: string]: (s: State, action: any) => Partial<State> }} Reducers
 */

/**
 * @template Actions
 * @template Selectors
 * @template RootSelectors
 * @typedef {ActionMethods<Actions> & SelectorMethods<Selectors> & SelectorMethods<RootSelectors>} Store
 */

/**
 * @template State
 * @template Actions
 * @template Selectors
 * @template RootSelectors
 * @typedef Config
 * @prop {() => State} init
 * @prop {string} namespace
 * @prop {Reducers<State>} update
 * @prop {Actions} actions
 * @prop {Selectors} selectors
 * @prop {RootSelectors} [rootSelectors]
 */

/**
 * @template State
 * @template Actions
 * @template Selectors
 * @template RootSelectors
 * @param {Config<State,Actions,Selectors,RootSelectors>} config
 * @return {Store<Actions,Selectors,RootSelectors>}
 */
export function createStoreModule(config) {
  return /** @type {any} */ (config);
}
