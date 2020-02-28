import { parse as parseQuery, stringify } from 'query-string';

/**
 * @typedef {Object} Route
 * @prop {string} name
 * @prop {string} [path] -
 *   Optional path for the route, which may include `:`-prefixed parameters.
 *   If no path is provided, this is a default route which matches any URL.
 */

/**
 * Return a regex that matches a given route's path.
 *
 * @param {string} path - A path template (eg. `/objects/:id`.)
 */
function routeRegex(path) {
  // Any `:`-prefixed parameter in the path matches a non-empty path segment.
  const pattern = path.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)');
  return new RegExp(pattern);
}

/**
 * Return the parameter names in a route's path.
 *
 * @param {string} path
 * @return {string[]}
 */
function routeParams(path) {
  const params = path.match(/:[a-zA-Z0-9_]+/g) || [];

  // Strip leading ':' prefix.
  return params.map(p => p.slice(1));
}

/**
 * A dictionary of routes with methods for matching URLs to routes and
 * generating URLs for a given route.
 */
export class Routes {
  /**
   * Construct a route dictionary with a given set of routes.
   *
   * @param {Route[]}
   */
  constructor(routes) {
    this.routes = routes.map(route => ({
      name: route.name,
      path: route.path,
      pathRegex: routeRegex(route.path || ''),
      pathParams: routeParams(route.path || ''),
    }));
  }

  /**
   * Match a URL against the set of routes
   *
   * @param {string} url
   * @return {{name: string, params: Object}}
   */
  match(url) {
    let matchingRoute = null;
    const params = {};

    // nb. The base URL doesn't actually matter as we are just using `URL`
    // to extract the path and query from the URL.
    const baseURL = window.location.href;
    const parsedURL = new URL(url, baseURL);
    for (let route of this.routes) {
      let match;
      if (!route.path || (match = parsedURL.pathname.match(route.pathRegex))) {
        matchingRoute = route;
        route.pathParams.forEach((param, i) => {
          params[param] = match[i + 1];
        });
        break;
      }
    }

    if (!matchingRoute) {
      throw new Error('No matching route found');
    }

    // Add query paramters to match info, unless they conflict with path params.
    const queryParams = parseQuery(parsedURL.search);
    for (let key in queryParams) {
      if (!(key in params)) {
        params[key] = queryParams[key];
      }
    }
    return { route: matchingRoute.name, params };
  }

  /**
   * @param {string} routeName
   * @param {Object} params
   * @return {string}
   */
  url(routeName, params = {}) {
    // Find matching route.
    const route = this.routes.find(r => r.name === routeName);
    if (!route) {
      throw new Error(`No route named "${routeName}" exists`);
    }
    if (!route.path) {
      throw new Error(`Route "${routeName}" has no path`);
    }

    // Generate the path.
    let url = route.path;
    const unusedParams = { ...params };
    route.pathParams.forEach(param => {
      if (!(param in params)) {
        throw new Error(`Missing path param "${param}"`);
      }
      url = url.replace(':' + param, params[param]);
      delete unusedParams[param];
    });

    // Append unused parameters as a query string.
    const query = stringify(unusedParams);
    if (query) {
      url = url + '?' + query;
    }
    return url;
  }
}
