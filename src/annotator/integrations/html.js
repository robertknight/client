import { TinyEmitter as EventEmitter } from 'tiny-emitter';

import DocumentMeta from './html-metadata';
import * as anchoring from '../anchoring/html';

/**
 * @typedef {import('../../types/api').Selector} Selector
 */

export class HTMLIntegration extends EventEmitter {
  constructor() {
    super();
    this.documentMeta = new DocumentMeta();
  }

  destroy() {}

  contentContainer() {
    return document.body;
  }

  fitSideBySide() {
    // Not currently implemented.
    return false;
  }

  /**
   * @param {Element} root
   * @param {Selector[]} selectors
   * @return {Promise<Range>}
   */
  anchor(root, selectors) {
    return anchoring.anchor(root, selectors);
  }

  /**
   * @param {Element} root
   * @param {Range} range
   * @return {Selector[]|Promise<Selector[]>}
   */
  describe(root, range) {
    return anchoring.describe(root, range);
  }

  async uri() {
    return this.documentMeta.uri();
  }

  async metadata() {
    this.documentMeta.getDocumentMetadata();
    return this.documentMeta.metadata;
  }
}
