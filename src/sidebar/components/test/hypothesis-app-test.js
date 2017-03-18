'use strict';

var angular = require('angular');
var proxyquire = require('proxyquire');

var events = require('../../events');
var bridgeEvents = require('../../../shared/bridge-events');
var util = require('../../../shared/test/util');

describe('HypothesisAppController', function () {
  var $componentController = null;
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
    return $componentController('hypothesisApp', locals);
  };

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function () {
    fakeAnnotationMetadata = {
      location: function () { return 0; },
    };

    fakeServiceConfig = sandbox.stub();

    var component = proxyquire('../hypothesis-app', util.noCallThru({
      'angular': angular,
      '../annotation-metadata': fakeAnnotationMetadata,
      '../service-config': fakeServiceConfig,
    }));

    angular.module('h', [])
      .component('hypothesisApp', component);
  });

  beforeEach(angular.mock.module('h'));

  beforeEach(angular.mock.module(function ($provide) {
    fakeAnnotationUI = {
      tool: 'comment',
      clearSelectedAnnotations: sandbox.spy(),
      getState: sandbox.stub().returns({}),
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
      path: sandbox.stub().returns('/app.html'),
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
    $provide.value('$location', fakeLocation);
    $provide.value('$window', fakeWindow);
  }));

  beforeEach(angular.mock.inject(function (_$componentController_, _$rootScope_) {
    $componentController = _$componentController_;
    $rootScope = _$rootScope_;
    $scope = $rootScope.$new();
  }));

  afterEach(function () {
    sandbox.restore();
  });

  describe('isSidebar property', function () {

    it('is false if the window is the top window', function () {
      fakeWindow.top = fakeWindow;
      var ctrl = createController();
      assert.isFalse(ctrl.isSidebar);
    });

    it('is true if the window is not the top window', function () {
      fakeWindow.top = {};
      var ctrl = createController();
      assert.isTrue(ctrl.isSidebar);
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
    var ctrl = createController();
    assert.equal(ctrl.serviceUrl, fakeServiceUrl);
  });

  it('does not show login form for logged in users', function () {
    var ctrl = createController();
    assert.isFalse(ctrl.accountDialog.visible);
  });

  it('does not show the share dialog at start', function () {
    var ctrl = createController();
    assert.isFalse(ctrl.shareDialog.visible);
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
      var ctrl = createController();
      ctrl.login();
      assert.equal(ctrl.accountDialog.visible, true);
    });

    it('sends DO_LOGIN if a third-party service is in use', function () {
      // If the client is using a third-party annotation service then clicking
      // on a login button should send the DO_LOGIN event over the bridge
      // (so that the partner site we're embedded in can do its own login
      // thing).
      fakeServiceConfig.returns({});
      var ctrl = createController();

      ctrl.login();

      assert.equal(fakeBridge.call.callCount, 1);
      assert.isTrue(fakeBridge.call.calledWithExactly(bridgeEvents.DO_LOGIN));
    });
  });

  describe('#share()', function () {
    it('shows the share dialog', function () {
      var ctrl = createController();
      ctrl.share();
      assert.equal(ctrl.shareDialog.visible, true);
    });
  });

  describe('#logout()', function () {
    it('calls session.logout()', function () {
      var ctrl = createController();
      ctrl.logout();
      assert.called(fakeSession.logout);
    });

    it('prompts the user if there are drafts', function () {
      fakeDrafts.count.returns(1);
      var ctrl = createController();

      ctrl.logout();

      assert.equal(fakeWindow.confirm.callCount, 1);
    });

    it('emits "annotationDeleted" for each unsaved draft annotation', function () {
      fakeDrafts.unsaved = sandbox.stub().returns(
        ['draftOne', 'draftTwo', 'draftThree']
      );
      var ctrl = createController();
      $rootScope.$emit = sandbox.stub();

      ctrl.logout();

      assert($rootScope.$emit.calledThrice);
      assert.deepEqual(
        $rootScope.$emit.firstCall.args, ['annotationDeleted', 'draftOne']);
      assert.deepEqual(
        $rootScope.$emit.secondCall.args, ['annotationDeleted', 'draftTwo']);
      assert.deepEqual(
        $rootScope.$emit.thirdCall.args, ['annotationDeleted', 'draftThree']);
    });

    it('discards draft annotations', function () {
      var ctrl = createController();

      ctrl.logout();

      assert(fakeDrafts.discard.calledOnce);
    });

    it('does not emit "annotationDeleted" if the user cancels the prompt', function () {
      var ctrl = createController();
      fakeDrafts.count.returns(1);
      $rootScope.$emit = sandbox.stub();
      fakeWindow.confirm.returns(false);

      ctrl.logout();

      assert($rootScope.$emit.notCalled);
    });

    it('does not discard drafts if the user cancels the prompt', function () {
      var ctrl = createController();
      fakeDrafts.count.returns(1);
      fakeWindow.confirm.returns(false);

      ctrl.logout();

      assert(fakeDrafts.discard.notCalled);
    });

    it('does not prompt if there are no drafts', function () {
      var ctrl = createController();
      fakeDrafts.count.returns(0);

      ctrl.logout();

      assert.equal(fakeWindow.confirm.callCount, 0);
    });
  });

  describe('#appType', function () {
    it('is "sidebar" when the path is "/app.html"', function () {
      fakeLocation.path.returns('/app.html');
      var ctrl = createController();
      assert.equal(ctrl.appType, 'sidebar');
    });

    it('is "annotation" when the path is "/a/:id"', function () {
      fakeLocation.path.returns('/a/1234');
      var ctrl = createController();
      assert.equal(ctrl.appType, 'annotation');
    });

    it('is "stream" when the path is "/stream"', function () {
      fakeLocation.path.returns('/stream');
      var ctrl = createController();
      assert.equal(ctrl.appType, 'stream');
    });
  });

  describe('#search.query', function () {
    it('returns the filter query in the sidebar', function () {
      fakeLocation.path.returns('/app.html');
      fakeAnnotationUI.getState.returns({ filterQuery: 'foo' });
      var ctrl = createController();
      assert.equal(ctrl.search.query(), 'foo');
    });

    it('returns the "q" route param otherwise', function () {
      fakeLocation.path.returns('/stream');
      fakeParams.q = 'bar';
      var ctrl = createController();
      assert.equal(ctrl.search.query(), 'bar');
    });
  });

  describe('#search.update', function () {
    it('sets the filter query in the sidebar', function () {
      fakeLocation.path.returns('/app.html');
      fakeAnnotationUI.setFilterQuery = sandbox.stub();

      var ctrl = createController();
      ctrl.search.update('wibble');

      assert.calledWith(fakeAnnotationUI.setFilterQuery, 'wibble');
    });

    it('redirects to the stream and sets the "q" param otherwise', function () {
      fakeLocation.path = sandbox.spy(function (path) {
        if (path) {
          return fakeLocation;
        } else {
          return '/stream';
        }
      });

      var ctrl = createController();
      ctrl.search.update('wibble');

      assert.calledWith(fakeLocation.path, '/stream');
      assert.calledWith(fakeLocation.search, 'q', 'wibble');
    });
  });

  describe('#hasFetchedProfile', function () {
    it('is true if the auth state is known', function () {
      fakeAnnotationUI.authStatus = sandbox.stub().returns({status: 'logged-in'});
      var ctrl = createController();
      assert.isTrue(ctrl.hasFetchedProfile());
    });

    it('is false if the auth state is not known', function () {
      fakeAnnotationUI.authStatus = sandbox.stub().returns({status: 'unknown'});
      var ctrl = createController();
      assert.isFalse(ctrl.hasFetchedProfile());
    });
  });
});
