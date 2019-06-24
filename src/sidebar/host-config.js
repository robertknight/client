'use strict';

/**
 * Configuration for the client provided by the frame embedding it.
 *
 * User-facing documentation exists at
 * https://h.readthedocs.io/projects/client/en/latest/publishers/config/
 *
 * @typedef {Object} Config
 *
 * @prop {string} [annotations] - Direct-linked annotation ID
 * @prop {string} [group] - Direct-linked group ID
 * @prop {string} [query] - Initial filter query
 * @prop {string} [appType] - Method used to load the client
 * @prop {boolean} [openSidebar] - Whether to open the sidebar on the initial load
 * @prop {boolean} [showHighlights] - Whether to show highlights
 * @prop {Object[]} [services] -
 *   Configuration for the annotation services that the client connects to
 * @prop {Object} [branding] -
 *   Theme properties (fonts, colors etc.)
 * @prop {boolean} [enableExperimentalNewNoteButton] -
 *   Whether to show the "New note" button on the "Page Notes" tab
 * @prop {string} [requestConfigFromFrame]
 *   Origin of the ancestor frame to request configuration from
 * @prop {string} [theme]
 *   Name of the base theme to use.
 * @prop {string} [usernameUrl]
 *   URL template for username links
 */

const queryString = require('query-string');

/**
 * Return the app configuration specified by the frame embedding the Hypothesis
 * client.
 *
 * @return {Config}
 */
function hostPageConfig(window) {
  const configJSON = queryString.parse(window.location.search).config;
  const config = JSON.parse(configJSON || '{}');

  // Known configuration parameters which we will import from the host page.
  // Note that since the host page is untrusted code, the filtering needs to
  // be done here.
  const paramWhiteList = [
    // Direct-linked annotation ID
    'annotations',

    // Direct-linked group ID
    'group',

    // Default query passed by url
    'query',

    // Config param added by the extension, Via etc.  indicating how Hypothesis
    // was added to the page.
    'appType',

    // Config params documented at
    // https://h.readthedocs.io/projects/client/en/latest/publishers/config/
    'openSidebar',
    'showHighlights',
    'services',
    'branding',

    // New note button override.
    // This should be removed once new note button is enabled for everybody.
    'enableExperimentalNewNoteButton',

    // Fetch config from a parent frame.
    'requestConfigFromFrame',

    // Theme which can either be specified as 'clean'.
    // If nothing is the specified the classic look is applied.
    'theme',

    'usernameUrl',
  ];

  return Object.keys(config).reduce(function(result, key) {
    if (paramWhiteList.indexOf(key) !== -1) {
      // Ignore `null` values as these indicate a default value.
      // In this case the config value set in the sidebar app HTML config is
      // used.
      if (config[key] !== null) {
        result[key] = config[key];
      }
    }
    return result;
  }, {});
}

module.exports = hostPageConfig;
