'use strict';

// Minimal set of polyfills for PhantomJS 1.x under Karma.
// this Polyfills:
//
// - ES5
// - ES6 Promises
// - the DOM URL API

// Basic polyfills for APIs which are supported natively
// by all browsers we support (IE >= 10)
require('core-js/es5');

// PhantomJS 1.x does not support rAF.
require('raf').polyfill();

// Additional polyfills for newer features.
// Be careful that any polyfills used here match what is used in the
// app itself.
require('./polyfills');

// PhantomJS 2.x includes a `URL` constructor so `new URL` works
// but it appears to be broken.
require('js-polyfills/url');
