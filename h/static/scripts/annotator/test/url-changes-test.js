'use strict';

var urlChanges = require('../url-changes');

describe('URL changes', function () {
  var changes;
  var urlChanged;

  beforeEach(function () {
    urlChanged = sinon.stub();
    changes = urlChanges().subscribe({
      next: urlChanged,
    });
  });

  afterEach(function () {
    changes.unsubscribe();
  });

  it('emits new URL when History#pushState is called', function () {
    window.history.pushState({}, '', '/new-url');
    assert.calledWith(urlChanged, document.location.href);
  });

  it('emits new URL when History#replaceState is called', function () {
    window.history.replaceState({}, '', '/new-url');
    assert.calledWith(urlChanged, document.location.href);
  });

  it('emits new URL when a "popstate" event occurs', function (done) {
    window.history.pushState({}, '', '/orig-url');
    window.history.pushState({}, '', '/new-url');
    urlChanged.reset();

    window.history.back();

    // The "popstate" event is async, so check after an immediate timeout
    setTimeout(function () {
      assert.calledWith(urlChanged, document.location.href);
      done();
    }, 0);
  });
});
