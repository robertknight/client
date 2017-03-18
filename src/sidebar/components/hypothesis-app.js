'use strict';

var scrollIntoView = require('scroll-into-view');

var events = require('../events');
var scopeTimeout = require('../util/scope-timeout');
var serviceConfig = require('../service-config');
var bridgeEvents = require('../../shared/bridge-events');

// @ngInject
function HypothesisAppController(
  $document, $location, $rootScope, $route, $routeParams, $scope,
  $window, annotationUI, auth, bridge, drafts, features, frameSync, groups,
  serviceUrl, session, settings, streamer
) {

  this.auth = annotationUI.authStatus;

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

  var self = this;

  // Reload the view when the user switches accounts
  $scope.$on(events.USER_CHANGED, function (event, data) {
    self.accountDialog.visible = false;

    if (!data || !data.initialLoad) {
      $route.reload();
    }
  });

  session.load().then(function (state) {
    if (!state.userid && settings.openLoginForm) {
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

  // Start the login flow. This will present the user with the login dialog.
  this.login = function () {
    if (serviceConfig(settings)) {
      bridge.call(bridgeEvents.DO_LOGIN);
      return;
    }

    self.accountDialog.visible = true;
    scrollToView('login-form');
  };

  // Display the dialog for sharing the current page
  this.share = function () {
    self.shareDialog.visible = true;
    scrollToView('share-dialog');
  };

  // Prompt to discard any unsaved drafts.
  var promptToLogout = function () {
    // TODO - Replace this with a UI which doesn't look terrible.
    var text = '';
    if (drafts.count() === 1) {
      text = 'You have an unsaved annotation.\n' +
        'Do you really want to discard this draft?';
    } else if (drafts.count() > 1) {
      text = 'You have ' + drafts.count() + ' unsaved annotations.\n' +
        'Do you really want to discard these drafts?';
    }
    return (drafts.count() === 0 || $window.confirm(text));
  };

  // Log the user out.
  this.logout = function () {
    if (!promptToLogout()) {
      return;
    }
    drafts.unsaved().forEach(function (draft) {
      $rootScope.$emit(events.ANNOTATION_DELETED, draft);
    });
    drafts.discard();
    self.accountDialog.visible = false;
    session.logout();
  };

  // This duplicates the router's pattern-matching, but the router will soon be
  // removed in favor of just instantiating the appropriate content component
  // depending on the app mode.
  if ($location.path() === '/stream') {
    this.appType = 'stream';
  } else if ($location.path().match(/\/a\/.*/)) {
    this.appType = 'annotation';
  } else {
    this.appType = 'sidebar';
  }

  this.search = {
    query: function () {
      if (self.appType === 'sidebar') {
        return annotationUI.getState().filterQuery;
      } else {
        return $routeParams.q || '';
      }
    },
    update: function (query) {
      if (self.appType === 'sidebar') {
        annotationUI.setFilterQuery(query);
      } else {
        $location.path('/stream').search('q', query);
      }
    },
  };

  this.countPendingUpdates = streamer.countPendingUpdates;
  this.applyPendingUpdates = streamer.applyPendingUpdates;
}

module.exports = {
  controller: HypothesisAppController,
  controllerAs: 'vm',
  bindings: {},
  template: require('../templates/hypothesis_app.html'),
};
