import { jsonConfigsFrom } from '../shared/settings';

import crossOriginRPC from './cross-origin-rpc.js';
import addAnalytics from './ga';
import serviceConfig from './service-config';
import disableOpenerForExternalLinks from './util/disable-opener-for-external-links';
import { fetchConfig } from './util/fetch-config';
import * as sentry from './util/sentry';

// Read settings rendered into sidebar app HTML by service/extension.
const appConfig = jsonConfigsFrom(document);

if (appConfig.sentry) {
  // Initialize Sentry. This is required at the top of this file
  // so that it happens early in the app's startup flow
  sentry.init(appConfig.sentry);
}

// Disable Angular features that are not compatible with CSP.
//
// See https://docs.angularjs.org/api/ng/directive/ngCsp
//
// The `ng-csp` attribute must be set on some HTML element in the document
// _before_ Angular is require'd for the first time.
document.body.setAttribute('ng-csp', '');

// Prevent tab-jacking.
disableOpenerForExternalLinks(document.body);

import angular from 'angular';

// Angular addons which export the Angular module name via `module.exports`.

import angularRoute from 'angular-route';
import angularToastr from 'angular-toastr';

// autofill-event relies on the existence of window.angular so
// it must be require'd after angular is first require'd
import 'autofill-event';

// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debugging checks for Preact.
import 'preact/debug';

import wrapReactComponent from './util/wrap-react-component';

if (appConfig.googleAnalytics) {
  addAnalytics(appConfig.googleAnalytics);
}

// Fetch external state that the app needs before it can run. This includes the
// user's profile and list of groups.
const resolve = {
  // @ngInject
  state: function(groups, session) {
    return Promise.all([groups.load(), session.load()]);
  },
};

const isSidebar = !(
  window.location.pathname.startsWith('/stream') ||
  window.location.pathname.startsWith('/a/')
);

// @ngInject
function configureLocation($locationProvider) {
  // Use HTML5 history
  return $locationProvider.html5Mode(true);
}

// @ngInject
function configureRoutes($routeProvider) {
  // The `vm.{auth,search}` properties used in these templates come from the
  // `<hypothesis-app>` component which hosts the router's container element.
  $routeProvider.when('/a/:id', {
    template: '<annotation-viewer-content></annotation-viewer-content>',
    reloadOnSearch: false,
    resolve: resolve,
  });
  $routeProvider.when('/stream', {
    template: '<stream-content></stream-content>',
    reloadOnSearch: false,
    resolve: resolve,
  });
  $routeProvider.otherwise({
    template:
      '<sidebar-content auth="vm.auth" on-login="vm.login()"></sidebar-content>',
    reloadOnSearch: false,
    resolve: resolve,
  });
}

// @ngInject
function configureToastr(toastrConfig) {
  angular.extend(toastrConfig, {
    preventOpenDuplicates: true,
  });
}

// @ngInject
function setupApi(api, streamer) {
  api.setClientId(streamer.clientId);
}

/**
 * Send a page view event when the app starts up.
 *
 * We don't bother tracking route changes later because the client only uses a
 * single route in a given session.
 */
// @ngInject
function sendPageView(analytics) {
  analytics.sendPageView();
}

/**
 * Fetch any persisted client-side defaults, and persist any app-state changes to
 * those defaults
 */
// @ngInject
function persistDefaults(persistedDefaults) {
  persistedDefaults.init();
}

// Preact UI components that are wrapped for use within Angular templates.

import AnnotationActionBar from './components/annotation-action-bar';
import AnnotationBody from './components/annotation-body';
import AnnotationHeader from './components/annotation-header';
import AnnotationLicense from './components/annotation-license';
import AnnotationOmega from './components/annotation-omega';
import AnnotationPublishControl from './components/annotation-publish-control';
import AnnotationQuote from './components/annotation-quote';
import FocusedModeHeader from './components/focused-mode-header';
import HelpPanel from './components/help-panel';
import LoggedOutMessage from './components/logged-out-message';
import ModerationBanner from './components/moderation-banner';
import SearchStatusBar from './components/search-status-bar';
import SelectionTabs from './components/selection-tabs';
import ShareAnnotationsPanel from './components/share-annotations-panel';
import SidebarContentError from './components/sidebar-content-error';
import SvgIcon from './components/svg-icon';
import TagEditor from './components/tag-editor';
import TagList from './components/tag-list';
import TopBar from './components/top-bar';

// Remaining UI components that are still built with Angular.

import annotation from './components/annotation';
import annotationThread from './components/annotation-thread';
import annotationViewerContent from './components/annotation-viewer-content';
import hypothesisApp from './components/hypothesis-app';
import sidebarContent from './components/sidebar-content';
import streamContent from './components/stream-content';
import threadList from './components/thread-list';

// Angular directives.

import hAutofocusDirective from './directive/h-autofocus';
import hBrandingDirective from './directive/h-branding';
import hOnTouchDirective from './directive/h-on-touch';
import hTooltipDirective from './directive/h-tooltip';
import windowScrollDirective from './directive/window-scroll';

// Services.

import bridgeService from '../shared/bridge';

import analyticsService from './services/analytics';
import annotationMapperService from './services/annotation-mapper';
import annotationsService from './services/annotations';
import apiService from './services/api';
import apiRoutesService from './services/api-routes';
import featuresService from './services/features';
import flashService from './services/flash';
import frameSyncService from './services/frame-sync';
import groupsService from './services/groups';
import localStorageService from './services/local-storage';
import authService from './services/oauth-auth';
import permissionsService from './services/permissions';
import persistedDefaultsService from './services/persisted-defaults';
import rootThreadService from './services/root-thread';
import searchFilterService from './services/search-filter';
import serviceUrlService from './services/service-url';
import sessionService from './services/session';
import streamFilterService from './services/stream-filter';
import streamerService from './services/streamer';
import tagsService from './services/tags';
import unicodeService from './services/unicode';
import viewFilterService from './services/view-filter';

// Redux store.

import store from './store';

// Utilities.

import Discovery from '../shared/discovery';

import { encode as urlEncodeFilter } from './filter/url';
import OAuthClient from './util/oauth-client';
import * as random from './util/random';
import * as time from './util/time';
import VirtualThreadList from './virtual-thread-list';

import { Injector } from '../shared/injector';

function startAngularApp(config) {
  // Create dependency Injection/IoC container for services.
  //
  // This is a replacement for the use of Angular's dependency injection
  // (including `$injector`) to construct services with dependencies.
  const container = new Injector();

  // Register services.
  container
    .register('analytics', analyticsService)
    .register('annotationMapper', annotationMapperService)
    .register('annotations', annotationsService)
    .register('api', apiService)
    .register('apiRoutes', apiRoutesService)
    .register('auth', authService)
    .register('bridge', bridgeService)
    .register('features', featuresService)
    .register('flash', flashService)
    .register('frameSync', frameSyncService)
    .register('groups', groupsService)
    .register('localStorage', localStorageService)
    .register('permissions', permissionsService)
    .register('persistedDefaults', persistedDefaultsService)
    .register('rootThread', rootThreadService)
    .register('searchFilter', searchFilterService)
    .register('serviceUrl', serviceUrlService)
    .register('session', sessionService)
    .register('streamer', streamerService)
    .register('streamFilter', streamFilterService)
    .register('tags', tagsService)
    .register('unicode', unicodeService)
    .register('viewFilter', viewFilterService)
    .register('store', store);

  // Register utility values/classes.
  //
  // nb. In many cases these can be replaced by direct imports in the services
  // that use them, since they don't depend on instances of other services.
  container
    .register('$window', () => window)
    .register('Discovery', () => Discovery)
    .register('OAuthClient', () => OAuthClient)
    .register('VirtualThreadList', () => VirtualThreadList)
    .register('isSidebar', () => isSidebar)
    .register('random', () => random)
    .register('serviceConfig', () => serviceConfig)
    .register('settings', () => config)
    .register('time', () => time)
    .register('urlEncodeFilter', () => urlEncodeFilter);

  // Register services which only Angular can construct, once Angular has
  // constructed them.
  //
  // @ngInject
  function registerAngularServices($rootScope, toastr) {
    container.register('toastr', () => toastr);
    container.register('$rootScope', () => $rootScope);
  }

  angular
    .module('h', [angularRoute, angularToastr])

    // The root component for the application
    .component('hypothesisApp', hypothesisApp)

    // UI components
    .component('annotation', annotation)
    .component('annotationBody', wrapReactComponent(AnnotationBody))
    .component('annotationHeader', wrapReactComponent(AnnotationHeader))
    .component('annotationActionBar', wrapReactComponent(AnnotationActionBar))
    .component('annotationLicense', wrapReactComponent(AnnotationLicense))
    .component('annotationOmega', wrapReactComponent(AnnotationOmega))
    .component(
      'annotationPublishControl',
      wrapReactComponent(AnnotationPublishControl)
    )
    .component('annotationQuote', wrapReactComponent(AnnotationQuote))
    .component('annotationThread', annotationThread)
    .component('annotationViewerContent', annotationViewerContent)
    .component('helpPanel', wrapReactComponent(HelpPanel))
    .component('loggedOutMessage', wrapReactComponent(LoggedOutMessage))
    .component('moderationBanner', wrapReactComponent(ModerationBanner))
    .component('searchStatusBar', wrapReactComponent(SearchStatusBar))
    .component('focusedModeHeader', wrapReactComponent(FocusedModeHeader))
    .component('selectionTabs', wrapReactComponent(SelectionTabs))
    .component('sidebarContent', sidebarContent)
    .component('sidebarContentError', wrapReactComponent(SidebarContentError))
    .component(
      'shareAnnotationsPanel',
      wrapReactComponent(ShareAnnotationsPanel)
    )
    .component('streamContent', streamContent)
    .component('svgIcon', wrapReactComponent(SvgIcon))
    .component('tagEditor', wrapReactComponent(TagEditor))
    .component('tagList', wrapReactComponent(TagList))
    .component('threadList', threadList)
    .component('topBar', wrapReactComponent(TopBar))
    .directive('hAutofocus', hAutofocusDirective)
    .directive('hBranding', hBrandingDirective)
    .directive('hOnTouch', hOnTouchDirective)
    .directive('hTooltip', hTooltipDirective)
    .directive('windowScroll', windowScrollDirective)

    // Register services, the store and utilities with Angular, so that
    // Angular components can use them.
    .service('analytics', () => container.get('analytics'))
    .service('annotationMapper', () => container.get('annotationMapper'))
    .service('annotations', () => container.get('annotations'))
    .service('api', () => container.get('api'))
    .service('apiRoutes', () => container.get('apiRoutes'))
    .service('auth', () => container.get('auth'))
    .service('bridge', () => container.get('bridge'))
    .service('features', () => container.get('features'))
    .service('flash', () => container.get('flash'))
    .service('frameSync', () => container.get('frameSync'))
    .service('groups', () => container.get('groups'))
    .service('localStorage', () => container.get('localStorage'))
    .service('permissions', () => container.get('permissions'))
    .service('persistedDefaults', () => container.get('persistedDefaults'))
    .service('rootThread', () => container.get('rootThread'))
    .service('searchFilter', () => container.get('searchFilter'))
    .service('serviceUrl', () => container.get('serviceUrl'))
    .service('session', () => container.get('session'))
    .service('streamer', () => container.get('streamer'))
    .service('streamFilter', () => container.get('streamFilter'))
    .service('tags', () => container.get('tags'))
    .service('unicode', () => container.get('unicode'))
    .service('viewFilter', () => container.get('viewFilter'))

    // Redux store
    .service('store', () => container.get('store'))

    // Utilities
    .value('Discovery', container.get('Discovery'))
    .value('OAuthClient', container.get('OAuthClient'))
    .value('VirtualThreadList', container.get('VirtualThreadList'))
    .value('isSidebar', container.get('isSidebar'))
    .value('random', container.get('random'))
    .value('serviceConfig', container.get('serviceConfig'))
    .value('settings', container.get('settings'))
    .value('time', container.get('time'))
    .value('urlEncodeFilter', container.get('urlEncodeFilter'))

    .config(configureLocation)
    .config(configureRoutes)
    .config(configureToastr)

    .run(registerAngularServices)

    .run(persistDefaults)
    .run(sendPageView)
    .run(setupApi)
    .run(crossOriginRPC.server.start);

  if (config.liveReloadServer) {
    require('./live-reload-client').connect(config.liveReloadServer);
  }

  // Work around a check in Angular's $sniffer service that causes it to
  // incorrectly determine that Firefox extensions are Chrome Packaged Apps which
  // do not support the HTML 5 History API. This results Angular redirecting the
  // browser on startup and thus the app fails to load.
  // See https://github.com/angular/angular.js/blob/a03b75c6a812fcc2f616fc05c0f1710e03fca8e9/src/ng/sniffer.js#L30
  if (window.chrome && !window.chrome.app) {
    window.chrome.app = {
      dummyAddedByHypothesisClient: true,
    };
  }

  const appEl = document.querySelector('hypothesis-app');
  angular.bootstrap(appEl, ['h'], { strictDi: true });
}

fetchConfig(appConfig)
  .then(config => {
    startAngularApp(config);
  })
  .catch(err => {
    // Report error. This will be the only notice that the user gets because the
    // sidebar does not currently appear at all if the Angular app fails to
    // start.
    console.error('Failed to start Hypothesis client: ', err);
  });
