import { Router } from '../util/router';

/**
 * A service that manages the association between the route and route parameters
 * implied by the URL and the corresponding route state in the store.
 */
// @ngInject
export default function router(store) {
  const routes = [
    {
      name: 'annotation',
      path: '/a/:id',
    },
    {
      name: 'stream',
      path: '/stream',
    },
    {
      name: 'sidebar',
    },
  ];
  const router = new Router(routes);

  function init() {
    router.on('routechange', (route, params) => {
      console.log('route changed to', route, params);
      store.changeRoute(route, params);
    });
    const { route, params } = router.current();
    store.changeRoute(route, params);
  }

  /**
   * Navigate to a given route.
   *
   * @param {string} name
   * @param {Object} params
   */
  function navigate(name, params) {
    router.navigateTo(name, params);
  }

  return { init, navigate };
}
