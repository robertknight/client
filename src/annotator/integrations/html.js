import scrollIntoView from 'scroll-into-view';
import { TinyEmitter } from 'tiny-emitter';

import { anchor, describe } from '../anchoring/html';
import { LocationObserver } from '../location-observer';

import { HTMLMetadata } from './html-metadata';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Integration} Integration
 */

/**
 * Document type integration for ordinary web pages.
 *
 * This integration is used for web pages and applications that are not handled
 * by a more specific integration (eg. for PDFs).
 *
 * @implements {Integration}
 */
export class HTMLIntegration extends TinyEmitter {
  constructor(container = document.body) {
    super();

    this.container = container;
    this.anchor = anchor;
    this.describe = describe;

    this._htmlMeta = new HTMLMetadata();

    // Detect client-side URL changes triggered by the History API.
    this._locationObserver = new LocationObserver(async () => {
      // The `LocationObserver` callback gets passed the current `location.href`.
      // The `uriChanged` event however should report a URI that matches what `uri()`
      // returns, which may be different.
      const uri = await this.uri();
      this.emit('uriChanged', uri);
    });
  }

  destroy() {
    this._locationObserver.disconnect();
  }

  contentContainer() {
    return this.container;
  }

  fitSideBySide() {
    // Not yet implemented.
    return false;
  }

  async getMetadata() {
    return this._htmlMeta.getDocumentMetadata();
  }

  async uri() {
    return this._htmlMeta.uri();
  }

  /**
   * @param {Anchor} anchor
   */
  scrollToAnchor(anchor) {
    const highlights = /** @type {Element[]} */ (anchor.highlights);
    return new Promise(resolve => {
      scrollIntoView(highlights[0], resolve);
    });
  }
}
