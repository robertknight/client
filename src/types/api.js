'use strict';

/**
 * Type definitions for objects returned from the Hypothesis API.
 *
 * The canonical reference is the API documentation at
 * https://h.readthedocs.io/en/latest/api-reference/
 */

/**
 * @typedef {Object} Organization
 * @prop {string} name
 * @prop {string} logo
 */

/**
 * @typedef {Object} Group
 * @prop {string} id
 * @prop {Organization|null} organization
 *
 * // Types not present on API objects, but added by utilities in the client.
 * @prop {string} logo
 * @prop {boolean} isMember
 * @prop {boolean} isScopedToUri
 */

module.exports = {};
