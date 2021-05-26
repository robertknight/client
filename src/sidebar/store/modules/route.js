import { createStoreModule } from '../create-store';

/** @typedef {'sidebar'|'annotation'|'stream'|'notebook'} RouteName */

const initialState = {
  /**
   * The current route.
   *
   * @type {RouteName|null}
   */
  name: null,

  /**
   * Parameters of the current route.
   *
   * - The "annotation" route has an "id" (annotation ID) parameter.
   * - The "stream" route has a "q" (query) parameter.
   * - The "sidebar" route has no parameters.
   *
   * @type {Record<string, string>}
   */
  params: {},
};

export default createStoreModule(initialState, {
  namespace: 'route',
  actions: {
    /**
     * Change the active route.
     *
     * @param {RouteName} name - Name of the route to activate.
     * @param {Record<string,string>} params - Parameters associated with the route
     */
    changeRoute(state, name, params = {}) {
      return { name, params };
    },
  },
  selectors: {
    route(state) {
      return state.name;
    },

    /**
     * Return any parameters for the current route, extracted from the path and
     * query string.
     */
    routeParams(state) {
      return state.params;
    },
  },
});
