'use strict';

var inherits = require('inherits');
var EventEmitter = require('tiny-emitter');

var proxyquire = require('proxyquire');

// the most recently created FakeSocket instance
var fakeWebSocket = null;

function FakeSocket(url) {
  fakeWebSocket = this;

  this.messages = [];
  this.didClose = false;

  this.isConnected = sinon.stub().returns(true);

  this.send = function (message) {
    this.messages.push(message);
  };

  this.notify = function (message) {
    this.emit('message', {data: JSON.stringify(message)});
  };

  this.close = function () {
    this.didClose = true
  };
}
inherits(FakeSocket, EventEmitter);

describe('Streamer', function () {
  var fakeAnnotationMapper;
  var fakeGroups;
  var fakeRootScope;
  var fakeSession;
  var fakeSettings;
  var activeStreamer;
  var Streamer;

  function createDefaultStreamer() {
    activeStreamer = new Streamer(
      fakeRootScope,
      fakeAnnotationMapper,
      fakeGroups,
      fakeSession,
      fakeSettings
    );
  }

  beforeEach(function () {
    fakeRootScope = {
      $apply: function (callback) {
        callback();
      },
      $on: sinon.stub()
    };

    fakeAnnotationMapper = {
      loadAnnotations: sinon.stub(),
      unloadAnnotations: sinon.stub(),
    };

    fakeGroups = {
      focused: function () {
        return 'public';
      },
    };

    fakeSession = {
      update: sinon.stub(),
    };

    fakeSettings = {
      websocketUrl: 'ws://example.com/ws',
    };

    Streamer = proxyquire('../streamer', {
      './websocket': FakeSocket,
    });
  });

  it('should not create a websocket connection if websocketUrl is not provided', function () {
    fakeSettings = {};
    createDefaultStreamer();
    activeStreamer.connect();
    assert.isNull(fakeWebSocket);
  });

  it('should not create a websocket connection if the user is not logged in', function () {
    createDefaultStreamer();
    assert.isNull(fakeWebSocket);
  });

  it('should create a websocket connection if the user is logged in', function () {
    fakeSession.state = { userid: "foo" };
    createDefaultStreamer();
    assert.ok(fakeWebSocket);
  });

  it('should create a websocket connection if explicitly connected', function () {
    createDefaultStreamer();
    activeStreamer.connect();
    assert.ok(fakeWebSocket);
  });

  it('should have a non-null client ID', function () {
    createDefaultStreamer();
    assert.ok(activeStreamer.clientId);
  });

  it('should send the client ID on connection', function () {
    createDefaultStreamer();
    activeStreamer.connect();
    assert.equal(fakeWebSocket.messages.length, 1);
    assert.equal(fakeWebSocket.messages[0].messageType, 'client_id');
    assert.equal(fakeWebSocket.messages[0].value, activeStreamer.clientId);
  });

  it('should close any existing socket', function () {
    createDefaultStreamer();
    activeStreamer.connect();
    var oldStreamer = activeStreamer;
    var oldWebSocket = fakeWebSocket;
    activeStreamer.connect();
    assert.ok(oldWebSocket.didClose);
    assert.ok(!fakeWebSocket.didClose);
  });

  describe('annotation notifications', function () {
    it('should load new annotations', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      fakeWebSocket.notify({
        type: 'annotation-notification',
        options: {
          action: 'create',
        },
        payload: [{
          group: 'public'
        }]
      });
      assert.ok(fakeAnnotationMapper.loadAnnotations.calledOnce);
    });

    it('should unload deleted annotations', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      fakeWebSocket.notify({
        type: 'annotation-notification',
        options: {
          action: 'delete',
        },
        payload: [{
          group: 'public'
        }]
      });
      assert.ok(fakeAnnotationMapper.unloadAnnotations.calledOnce);
    });
  });

  describe('session change notifications', function () {
    it('updates the session when a notification is received', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      var model = {
        groups: [{
          id: 'new-group'
        }]
      };
      fakeWebSocket.notify({
        type: 'session-change',
        model: model,
      });
      assert.ok(fakeSession.update.calledWith(model));
    });
  });

  describe('reconnections', function () {
    it('resends configuration messages when a reconnection occurs', function () {
      createDefaultStreamer();
      activeStreamer.connect();
      fakeWebSocket.messages = [];
      fakeWebSocket.emit('open');
      assert.equal(fakeWebSocket.messages.length, 1);
      assert.equal(fakeWebSocket.messages[0].messageType, 'client_id');
    });
  });
});
