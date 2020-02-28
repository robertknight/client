import { Routes } from '../util/routes';

/**
 * A service that manages the association between the route and route parameters
 * implied by the URL and the corresponding route state in the store.
 */
// @ngInject
export default function router(store) {
  const routes = new Routes([
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
  ]);

  function init() {
    // Listen for user navigating back and forwards.
    window.addEventListener('popstate', event => {
      if (!event.state) {
        return;
      }
      const { name, params } = event.state;
      store.changeRoute(name, params);
    });

    // Set the initial route. There will always be a match because of the
    // default "sidebar" route.
    const match = routes.match(window.location.href);
    store.changeRoute(match.route, match.params);
  }

  /**
   * Navigate to a given route.
   *
   * @param {string} name
   * @param {Object} params
   */
  function navigate(name, params) {
    const url = routes.url(name, params);
    if (url) {
      window.history.pushState({ name, params }, '', url);
      store.changeRoute(name, params);
    }
  }

  return { init, navigate };
}
