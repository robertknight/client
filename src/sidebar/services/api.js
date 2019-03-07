'use strict';

const get = require('lodash.get');
const queryString = require('query-string');

const { replaceURLParams } = require('../util/url-util');

/**
 * Translate the response from a failed API call into an Error-like object.
 *
 * The details of the response are available on the `response` property of the
 * error.
 */
function translateResponseToError(response, data) {
  let message;
  if (response.status <= 0) {
    message = 'Service unreachable.';
  } else {
    message = response.status + ' ' + response.statusText;
    if (data && data.reason) {
      message = message + ': ' + data.reason;
    }
  }
  const err = new Error(message);
  err.response = response;
  return err;
}

/**
 * Return a shallow clone of `obj` with all client-only properties removed.
 * Client-only properties are marked by a '$' prefix.
 */
function stripInternalProperties(obj) {
  const result = {};

  for (const k in obj) {
    if (obj.hasOwnProperty(k) && k[0] !== '$') {
      result[k] = obj[k];
    }
  }

  return result;
}

/**
 * @typedef APIResponse
 * @prop {any} data - The JSON response from the API call.
 * @prop {string|null} token - The access token that was used to make the call
 *   or `null` if unauthenticated.
 */

/**
 * Options controlling how an API call is made or processed.
 *
 * @typedef APICallOptions
 * @prop [boolean] includeMetadata - If false (the default), the response is
 *   just the JSON response from the API. If true, the response is an `APIResponse`
 *   containing additional metadata about the request and response.
 */

/**
 * Function which makes an API request.
 *
 * @typedef {function} APICallFunction
 * @param [any] params - A map of URL and query string parameters to include with the request.
 * @param [any] data - The body of the request.
 * @param [APICallOptions] options
 * @return {Promise<any|APIResponse>}
 */

/**
 * Creates a function that will make an API call to a named route.
 *
 * @param links - Object or promise for an object mapping named API routes to
 *                URL templates and methods
 * @param route - The dotted path of the named API route (eg. `annotation.create`)
 * @param {Function} tokenGetter - Function which returns a Promise for an
 *                   access token for the API.
 * @return {APICallFunction}
 */
function createAPICall(links, route, tokenGetter) {
  return (params, data, options = {}) => {
    let accessToken;
    return Promise.all([links, tokenGetter()])
      .then(([links, token]) => {
        const descriptor = get(links, route);
        const headers = {
          'Content-Type': 'application/json',
          'Hypothesis-Client-Version': '__VERSION__', // replaced by versionify
        };

        accessToken = token;
        if (token) {
          headers.Authorization = 'Bearer ' + token;
        }

        const { url, params: queryParams } = replaceURLParams(
          descriptor.url,
          params
        );
        const apiUrl = new URL(url);
        apiUrl.search = queryString.stringify(queryParams);

        return fetch(apiUrl.toString(), {
          body: data ? JSON.stringify(stripInternalProperties(data)) : null,
          headers,
          method: descriptor.method,
        });
      })
      .then(response => {
        // TODO - Handle 500 responses here which may not have a decodable JSON
        // body.
        return Promise.all([response, response.json()]);
      })
      .then(([response, data]) => {
        if (response.status >= 400) {
          // Translate the API result into an `Error` to follow the convention that
          // Promises should be rejected with an Error or Error-like object.
          throw translateResponseToError(response, data);
        }

        if (options.includeMetadata) {
          return { data, token: accessToken };
        } else {
          return data;
        }
      });
  };
}

/**
 * API client for the Hypothesis REST API.
 *
 * Returns an object that with keys that match the routes in
 * the Hypothesis API (see http://h.readthedocs.io/en/latest/api/). See
 * `APICallFunction` for the syntax of API calls. For example:
 *
 * ```
 * api.annotations.update({ id: '1234' }, annotation).then(ann => {
 *   // Do something with the updated annotation.
 * }).catch(err => {
 *   // Do something if the API call fails.
 * });
 * ```
 *
 * This service handles authenticated calls to the API, using the `auth` service
 * to get auth tokens. The URLs for API endpoints are fetched from the `/api`
 * endpoint, a responsibility delegated to the `apiRoutes` service which does
 * not use authentication.
 */
// @ngInject
function api(apiRoutes, auth) {
  const links = apiRoutes.routes();
  function apiCall(route) {
    return createAPICall(links, route, auth.tokenGetter);
  }

  return {
    search: apiCall('search'),
    annotation: {
      create: apiCall('annotation.create'),
      delete: apiCall('annotation.delete'),
      get: apiCall('annotation.read'),
      update: apiCall('annotation.update'),
      flag: apiCall('annotation.flag'),
      hide: apiCall('annotation.hide'),
      unhide: apiCall('annotation.unhide'),
    },
    group: {
      member: {
        delete: apiCall('group.member.delete'),
      },
    },
    groups: {
      list: apiCall('groups.read'),
    },
    profile: {
      groups: {
        read: apiCall('profile.groups.read'),
      },
      read: apiCall('profile.read'),
      update: apiCall('profile.update'),
    },

    // The `links` endpoint is not included here. Clients should fetch these
    // from the `apiRoutes` service.
  };
}

module.exports = api;
