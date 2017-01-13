'use strict';

var EventEmitter = require('tiny-emitter');
var inherits = require('inherits');
var queryString = require('query-string');

var store = require('./store');

function resolve(url, base) {
  return new URL(url, base).href;
}

/**
 * Client for Hypothesis-compatible annotation services.
 *
 * The client handles authentication with the annotation service and provides
 * an interface to perform CRUD actions on annotations.
 */
// @ngInject
function AnnotationService($http, settings, jwtHelper) {
  var headers = {};
  var grantToken;
  var profileData = {};
  var token;
  var tokenExpiry;

  var legacyProfileEndpoint = resolve('app', settings.serviceUrl);

  if (Array.isArray(settings.services) && settings.services.length > 0) {
    grantToken = settings.services[0].grantToken;
  }

  var self = this;

  function updateProfile(model) {
    if (model.csrf) {
      // Include the CSRF token on subsequent calls to the /app endpoint.
      headers['X-CSRF-Token'] = model.csrf;
    }
    profileData = model;
    self.emit('profilechanged', model);

    return model;
  }

  /**
   * Retrieve the profile for the current user.
   *
   * This includes the user's identity, list of groups and active feature
   * flags.
   */
  this.profile = function () {
    if (profileData.groups) {
      return Promise.resolve(profileData);
    }

    var profile;

    if (grantToken) {
      profile = self.api.profile();
    } else {
      profile = $http.get(legacyProfileEndpoint).then(function (response) {
        if (response.status < 200 || response.status >= 400) {
          return {}; // TODO - Handle failure here.
        }
        return response.data.model;
      });
    }

    return profile.then(updateProfile);
  };

  this.logout = function () {
    return $http.post(legacyProfileEndpoint, null, {
      withCredentials: true,
      headers: headers,
      params: {
        '__formid__': 'logout',
      },
    }).then(updateProfile);
  };

  this.login = function (credentials) {
    return $http.post(legacyProfileEndpoint, credentials, {
      withCredentials: true,
      headers: headers,
      params: {
        '__formid__': 'login',
      },
    }).then(updateProfile);
  };

  this.dismissSidebarTutorial = function () {
    var url = resolve('app/dismiss_sidebar_tutorial', settings.serviceUrl);
    return $http.post(url, null, {
      withCredentials: true,
      headers: headers,
    });
  };

  /**
   * Get an access token for authenticating API requests.
   */
  function fetchAccessToken() {
    var tokenEndpoint = new URL('token', settings.apiUrl).href;
    if (token && Date.now() < tokenExpiry) {
      // Re-use the cached access token
      return Promise.resolve(token);
    } else if (grantToken) {
      // Exchange grant token provided by the 3rd-party hosting the page for
      // an access token.
      var data = queryString.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: grantToken,
      });
      var requestConfig = {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      };
      return $http.post(tokenEndpoint, data, requestConfig)
        .then(function (response) {
          if (response.status !== 200) {
            throw new Error('Failed to retrieve access token');
          }
          token = response.data.access_token;
          tokenExpiry = Date.now() + response.data.expires_in * 1000;

          return token;
        });
    } else {
      // Use the legacy 'GET /api/token' endpoint to get a JWT auth token using
      // cookie authentication.
      var config = {
        headers: headers,
        withCredentials: true,
      };
      return $http.get(tokenEndpoint, config).then(function (response) {
        if (response.status !== 200) {
          throw new Error('Failed to retrieve access token');
        }
        token = response.data;
        tokenExpiry = jwtHelper.getTokenExpirationDate(token);

        return token;
      });
    }
  }

  /**
   * Functions for making API requests to the service.
   */
  this.api = store($http, settings.apiUrl, fetchAccessToken);
}

inherits(AnnotationService, EventEmitter);

module.exports = AnnotationService;
