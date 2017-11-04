'use strict';

var scrollIntoView = require('scroll-into-view');

var events = require('../events');
var parseAccountID = require('../util/account-id').parseAccountID;
var scopeTimeout = require('../util/scope-timeout');
var serviceConfig = require('../util/service-config');
var bridgeEvents = require('../../shared/bridge-events');

/**
 * Return the user's authentication status from their profile.
 *
 * @param {Profile} profile - The profile object from the API.
 */
function authStateFromProfile(profile) {
  if (profile.userid) {
    var parsed = parseAccountID(profile.userid);
    var displayName = parsed.username;
    if (profile.user_info && profile.user_info.display_name) {
      displayName = profile.user_info.display_name;
    }
    return {
      status: 'logged-in',
      displayName,
      userid: profile.userid,
      username: parsed.username,
      provider: parsed.provider,
    };
  } else {
    return {status: 'logged-out'};
  }
}

// @ngInject
function HypothesisAppController(
  $document, $location, $rootScope, $route, $scope,
  $window, analytics, annotationUI, auth, bridge, features,
  flash, frameSync, groups, serviceUrl, session, settings, streamer
) {
  var self = this;

  // This stores information about the current user's authentication status.
  // When the controller instantiates we do not yet know if the user is
  // logged-in or not, so it has an initial status of 'unknown'. This can be
  // used by templates to show an intermediate or loading state.
  this.auth = {status: 'unknown'};

  // App dialogs
  this.accountDialog = {visible: false};
  this.shareDialog = {visible: false};
  this.helpPanel = {visible: false};

  // Check to see if we're in the sidebar, or on a standalone page such as
  // the stream page or an individual annotation page.
  this.isSidebar = $window.top !== $window;
  if (this.isSidebar) {
    frameSync.connect();
  }

  this.serviceUrl = serviceUrl;

  this.sortKey = function () {
    return annotationUI.getState().sortKey;
  };

  this.sortKeysAvailable = function () {
    return annotationUI.getState().sortKeysAvailable;
  };

  this.setSortKey = annotationUI.setSortKey;

  // Reload the view when the user switches accounts
  $scope.$on(events.USER_CHANGED, function (event, data) {
    self.auth = authStateFromProfile(data.profile);
    self.accountDialog.visible = false;
  });

  session.load().then(function (profile) {
    // When the authentication status of the user is known,
    // update the auth info in the top bar and show the login form
    // after first install of the extension.
    self.auth = authStateFromProfile(profile);

    if (!profile.userid && settings.openLoginForm && !auth.login) {
      self.login();
    }
  });

  /** Scroll to the view to the element matching the given selector */
  function scrollToView(selector) {
    // Add a timeout so that if the element has just been shown (eg. via ngIf)
    // it is added to the DOM before we try to locate and scroll to it.
    scopeTimeout($scope, function () {
      scrollIntoView($document[0].querySelector(selector));
    }, 0);
  }

  /**
   * Start the login flow. This will present the user with the login dialog.
   *
   * @return {Promise<void>} - A Promise that resolves when the login flow
   *   completes. For non-OAuth logins, always resolves immediately.
   */
  this.login = function () {
    if (serviceConfig(settings)) {
      // Let the host page handle the login request
      bridge.call(bridgeEvents.LOGIN_REQUESTED);
      return Promise.resolve();
    }

    if (auth.login) {
      // OAuth-based login 😀
      return auth.login().then(() => {
        session.reload();
      }).catch((err) => {
        flash.error(err.message);
      });
    } else {
      // Legacy cookie-based login 😔.
      self.accountDialog.visible = true;
      scrollToView('login-form');
      return Promise.resolve();
    }
  };

  this.signUp = function(){
    analytics.track(analytics.events.SIGN_UP_REQUESTED);

    if (serviceConfig(settings)) {
      // Let the host page handle the signup request
      bridge.call(bridgeEvents.SIGNUP_REQUESTED);
      return;
    }
    $window.open(serviceUrl('signup'));
  };

  // Display the dialog for sharing the current page
  this.share = function () {
    this.shareDialog.visible = true;
    scrollToView('share-dialog');
  };

  this.showHelpPanel = function () {
    var service = serviceConfig(settings) || {};
    if (service.onHelpRequestProvided) {
      // Let the host page handle the help request.
      bridge.call(bridgeEvents.HELP_REQUESTED);
      return;
    }

    this.helpPanel.visible = true;
  };

  // Prompt to discard any unsaved drafts.
  var promptToLogout = function () {
    // TODO - Replace this with a UI which doesn't look terrible.
    var text = '';
    var draftCount = annotationUI.countDrafts();

    if (draftCount === 1) {
      text = 'You have an unsaved annotation.\n' +
        'Do you really want to discard this draft?';
    } else if (draftCount > 1) {
      text = 'You have ' + draftCount + ' unsaved annotations.\n' +
        'Do you really want to discard these drafts?';
    }
    return (draftCount() === 0 || $window.confirm(text));
  };

  // Log the user out.
  this.logout = function () {
    if (!promptToLogout()) {
      return;
    }
    annotationUI.unsavedDrafts().forEach(function (draft) {
      $rootScope.$emit(events.ANNOTATION_DELETED, draft);
    });
    annotationUI.clearDrafts();

    if (serviceConfig(settings)) {
      // Let the host page handle the signup request
      bridge.call(bridgeEvents.LOGOUT_REQUESTED);
      return;
    }

    this.accountDialog.visible = false;
    session.logout();
  };

  this.search = {
    query: function () {
      return annotationUI.getState().filterQuery;
    },
    update: function (query) {
      annotationUI.setFilterQuery(query);
    },
  };

  this.countPendingUpdates = streamer.countPendingUpdates;
  this.applyPendingUpdates = streamer.applyPendingUpdates;
}

module.exports = {
  controller: HypothesisAppController,
  controllerAs: 'vm',
  template: require('../templates/hypothesis-app.html'),
};
