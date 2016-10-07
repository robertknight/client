'use strict';

var observable = require('../util/observable');

var patched = false;

/**
 * Monkey-patch the History API to enable URL changes via `pushState()` or
 * `replaceState()` to be observed.
 */
function setupPushStateEvent() {
  if (patched) {
    return;
  }

  var origReplaceState = History.prototype.replaceState;
  History.prototype.replaceState = function () {
    origReplaceState.apply(this, arguments);
    window.dispatchEvent(new Event('pushstate'));
  };

  var origPushState = History.prototype.pushState;
  History.prototype.pushState = function () {
    origPushState.apply(this, arguments);
    window.dispatchEvent(new Event('pushstate'));
  };

  patched = true;
}

/**
 * Return an Observable of document URL changes.
 */
function urlChanges() {
  setupPushStateEvent();
  return observable.listen(window, ['pushstate', 'popstate']).map(function () {
    return document.location.href;
  });
}

module.exports = urlChanges;
