import { replaceURLParams } from '../../util/url';

import { createStoreModule } from '../create-store';

/** @typedef {Record<string, string>|null} State */

export default createStoreModule(/** @type {State} */ (null), {
  namespace: 'links',
  actions: {
    /**
     * Update the link map
     *
     * @param {Record<string, string>} links - Link map fetched from the `/api/links` endpoint
     */
    updateLinks(state, links) {
      return links;
    },
  },
  selectors: {
    /**
     * Render a service link (URL) using the given `params`
     *
     * Returns an empty string if links have not been fetched yet.
     *
     * @param {string} linkName
     * @param {Record<string, string>} [params]
     * @return {string}
     */
    getLink(state, linkName, params = {}) {
      if (!state) {
        return '';
      }
      const template = state[linkName];
      if (!template) {
        throw new Error(`Unknown link "${linkName}"`);
      }
      const { url, unusedParams } = replaceURLParams(template, params);
      const unusedKeys = Object.keys(unusedParams);
      if (unusedKeys.length > 0) {
        throw new Error(`Unused parameters: ${unusedKeys.join(', ')}`);
      }
      return url;
    },
  },
});
