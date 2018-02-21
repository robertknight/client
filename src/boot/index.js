'use strict';

// This is the main entry point for the Hypothesis client in the host page
// and the sidebar application.
//
// The same boot script is used for both entry points so that the browser
// already has it cached when it encounters the reference in the sidebar
// application.

// Variables replaced by the build script

/* global __MANIFEST__ */

const boot = require('./boot');
const settings = require('../shared/settings').jsonConfigsFrom(document);

// Use the asset root and sidebar app locations specified in the host page, if
// they exist.
var assetRoot;
if (settings.assetRoot) {
  // The `assetRoot` setting is assumed to point at the root of the contents of
  // the npm package.
  settings.assetRoot += 'build/';
}
var sidebarAppUrl = settings.sidebarAppUrl;

// Otherwise, try to determine the default root URL for assets and the sidebar
// application from the location where the boot script is hosted.
try {
  var scriptUrl = new URL(document.currentScript.src);
  if (scriptUrl.pathname.endsWith('/boot.js')) {
    assetRoot = assetRoot || new URL('./', scriptUrl).href;
    sidebarAppUrl = sidebarAppUrl || new URL('app.html', scriptUrl);
  }
} catch (e) {
  // Pass
}

// Otherwise, fall back to hardcoded default URLs.
assetRoot = assetRoot || '__ASSET_ROOT__';
sidebarAppUrl = sidebarAppUrl || '__SIDEBAR_APP_URL__';

boot(document, {
  assetRoot,
  manifest: __MANIFEST__,
  sidebarAppUrl,
});
