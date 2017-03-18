'use strict';

var angular = require('angular');
var proxyquire = require('proxyquire');

var events = require('../events');
var bridgeEvents = require('../../shared/bridge-events');
var util = require('../../shared/test/util');

describe('AppController', function () {
  var $controller = null;
  var $scope = null;
  var $rootScope = null;
  var fakeAnnotationMetadata = null;
  var fakeAnnotationUI = null;
  var fakeAnalytics = null;
  var fakeAuth = null;
  var fakeBridge = null;
  var fakeDrafts = null;
  var fakeFeatures = null;
  var fakeFrameSync = null;
  var fakeLocation = null;
  var fakeParams = null;
  var fakeServiceConfig = null;
  var fakeSession = null;
  var fakeGroups = null;
  var fakeRoute = null;
  var fakeServiceUrl = null;
  var fakeSettings = null;
  var fakeStreamer = null;
  var fakeWindow = null;

  var sandbox = null;

  var createController = function (locals) {
    locals = locals || {};
    locals.$scope = $scope;
    return $controller('AppController', locals);
  };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function () {
    fakeAnnotationMetadata = {
      location: function () { return 0; },
    };

    fakeServiceConfig = sandbox.stub();

    var AppController = proxyquire('../app-controller', util.noCallThru({
      'angular': angular,
      './annotation-metadata': fakeAnnotationMetadata,
      './service-config': fakeServiceConfig,
    }));

    angular.module('h', [])
      .controller('AppController', AppController);
  });

  beforeEach(angular.mock.module('h'));

  beforeEach(angular.mock.module(function ($provide) {
    fakeAnnotationUI = {
      tool: 'comment',
      clearSelectedAnnotations: sandbox.spy(),
    };

    fakeAnalytics = {
      track: sandbox.stub(),
      events: {},
    };

    fakeAuth = {};

    fakeDrafts = {
      contains: sandbox.stub(),
      remove: sandbox.spy(),
      all: sandbox.stub().returns([]),
      discard: sandbox.spy(),
      count: sandbox.stub().returns(0),
      unsaved: sandbox.stub().returns([]),
    };

    fakeFeatures = {
      fetch: sandbox.spy(),
      flagEnabled: sandbox.stub().returns(false),
    };

    fakeFrameSync = {
      connect: sandbox.spy(),
    };

    fakeLocation = {
      search: sandbox.stub().returns({}),
    };

    fakeParams = {id: 'test'};

    fakeSession = {
      load: sandbox.stub().returns(Promise.resolve({userid: null})),
      logout: sandbox.stub(),
    };

    fakeGroups = {focus: sandbox.spy()};

    fakeRoute = {reload: sandbox.spy()};

    fakeWindow = {
      top: {},
      confirm: sandbox.stub(),
    };

    fakeServiceUrl = sinon.stub();
    fakeSettings = {};
    fakeStreamer = {
      countPendingUpdates: sinon.stub(),
      applyPendingUpdates: sinon.stub(),
    };
    fakeBridge = {
      call: sandbox.stub(),
    };

    $provide.value('annotationUI', fakeAnnotationUI);
    $provide.value('auth', fakeAuth);
    $provide.value('analytics', fakeAnalytics);
    $provide.value('drafts', fakeDrafts);
    $provide.value('features', fakeFeatures);
    $provide.value('frameSync', fakeFrameSync);
    $provide.value('serviceUrl', fakeServiceUrl);
    $provide.value('session', fakeSession);
    $provide.value('settings', fakeSettings);
    $provide.value('bridge', fakeBridge);
    $provide.value('streamer', fakeStreamer);
    $provide.value('groups', fakeGroups);
    $provide.value('$route', fakeRoute);
    $provide.value('$location', fakeLocation);
    $provide.value('$routeParams', fakeParams);
    $provide.value('$window', fakeWindow);
  }));

  beforeEach(angular.mock.inject(function (_$controller_, _$rootScope_) {
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
  }));

  afterEach(function () {
    sandbox.restore();
  });

  describe('isSidebar property', function () {

    it('is false if the window is the top window', function () {
      fakeWindow.top = fakeWindow;
      createController();
      assert.isFalse($scope.isSidebar);
    });

    it('is true if the window is not the top window', function () {
      fakeWindow.top = {};
      createController();
      assert.isTrue($scope.isSidebar);
    });
  });

  it('connects to host frame in the sidebar app', function () {
    fakeWindow.top = {};
    createController();
    assert.called(fakeFrameSync.connect);
  });

  it('does not connect to the host frame in the stream', function () {
    fakeWindow.top = fakeWindow;
    createController();
    assert.notCalled(fakeFrameSync.connect);
  });

  it('exposes the serviceUrl on the scope', function () {
    createController();
    assert.equal($scope.serviceUrl, fakeServiceUrl);
  });

  it('does not show login form for logged in users', function () {
    createController();
    assert.isFalse($scope.accountDialog.visible);
  });

  it('does not show the share dialog at start', function () {
    createController();
    assert.isFalse($scope.shareDialog.visible);
  });

  it('does not reload the view when the logged-in user changes on first load', function () {
    createController();
    fakeRoute.reload = sinon.spy();
    $scope.$broadcast(events.USER_CHANGED, {initialLoad: true});
    assert.notCalled(fakeRoute.reload);
  });

  it('reloads the view when the logged-in user changes after first load', function () {
    createController();
    fakeRoute.reload = sinon.spy();
    $scope.$broadcast(events.USER_CHANGED, {initialLoad: false});
    assert.calledOnce(fakeRoute.reload);
  });

  describe('#login()', function () {
    it('shows the login dialog if not using a third-party service', function () {
      // If no third-party annotation service is in use then it should show the
      // built-in login dialog.
      createController();
      $scope.login();
      assert.equal($scope.accountDialog.visible, true);
    });

    it('sends DO_LOGIN if a third-party service is in use', function () {
      // If the client is using a third-party annotation service then clicking
      // on a login button should send the DO_LOGIN event over the bridge
      // (so that the partner site we're embedded in can do its own login
      // thing).
      fakeServiceConfig.returns({});
      createController();

      $scope.login();

      assert.equal(fakeBridge.call.callCount, 1);
      assert.isTrue(fakeBridge.call.calledWithExactly(bridgeEvents.DO_LOGIN));
    });
  });

  describe('#share()', function () {
    it('shows the share dialog', function () {
      createController();
      $scope.share();
      assert.equal($scope.shareDialog.visible, true);
    });
  });

  describe('#logout()', function () {
    it('calls session.logout()', function () {
      createController();
      $scope.logout();
      assert.called(fakeSession.logout);
    });

    it('prompts the user if there are drafts', function () {
      fakeDrafts.count.returns(1);
      createController();

      $scope.logout();

      assert.equal(fakeWindow.confirm.callCount, 1);
    });

    it('emits "annotationDeleted" for each unsaved draft annotation', function () {
      fakeDrafts.unsaved = sandbox.stub().returns(
        ['draftOne', 'draftTwo', 'draftThree']
      );
      createController();
      $rootScope.$emit = sandbox.stub();

      $scope.logout();

      assert($rootScope.$emit.calledThrice);
      assert.deepEqual(
        $rootScope.$emit.firstCall.args, ['annotationDeleted', 'draftOne']);
      assert.deepEqual(
        $rootScope.$emit.secondCall.args, ['annotationDeleted', 'draftTwo']);
      assert.deepEqual(
        $rootScope.$emit.thirdCall.args, ['annotationDeleted', 'draftThree']);
    });

    it('discards draft annotations', function () {
      createController();

      $scope.logout();

      assert(fakeDrafts.discard.calledOnce);
    });

    it('does not emit "annotationDeleted" if the user cancels the prompt', function () {
      createController();
      fakeDrafts.count.returns(1);
      $rootScope.$emit = sandbox.stub();
      fakeWindow.confirm.returns(false);

      $scope.logout();

      assert($rootScope.$emit.notCalled);
    });

    it('does not discard drafts if the user cancels the prompt', function () {
      createController();
      fakeDrafts.count.returns(1);
      fakeWindow.confirm.returns(false);

      $scope.logout();

      assert(fakeDrafts.discard.notCalled);
    });

    it('does not prompt if there are no drafts', function () {
      createController();
      fakeDrafts.count.returns(0);

      $scope.logout();

      assert.equal(fakeWindow.confirm.callCount, 0);
    });
  });
});
