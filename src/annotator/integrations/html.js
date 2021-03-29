import scrollIntoView from 'scroll-into-view';

import { anchor, describe } from '../anchoring/html';
import { guessMainContentArea, preserveScrollPosition } from '../util/document-resizing';

import { HTMLMetadata } from './html-metadata';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Integration} Integration
 * @typedef {import('../../types/annotator').SidebarLayout} SidebarLayout
 */

/**
 * Document type integration for ordinary web pages.
 *
 * This integration is used for web pages and applications that are not handled
 * by a more specific integration (eg. for PDFs).
 *
 * @implements {Integration}
 */
export class HTMLIntegration {
  constructor(container = document.body) {
    this.container = container;
    this.anchor = anchor;
    this.describe = describe;

    this._htmlMeta = new HTMLMetadata();
  }

  destroy() {
    // There is nothing to do here yet.
  }

  contentContainer() {
    return this.container;
  }

  /**
   * @param {SidebarLayout} layout
   */
  fitSideBySide(layout) {
    if (layout.expanded) {
      this._activateSideBySide(layout.width);
      return true;
    } else {
      this._deactivateSideBySide();
      return false;
    }
  }

  /**
   * Resize the document content after side-by-side mode is activated.
   *
   * Subclasses can override this to customize how the document viewer is
   * resized when side-by-side mode is activated. If they do, they should also
   * implement `deactivateSideBySide`.
   *
   * @param {number} sidebarWidth
   */
  _activateSideBySide(sidebarWidth) {
    // When side-by-side mode is activated, what we want to achieve is that the
    // main content of the page is fully visible alongside the sidebar, with
    // as much space given to the main content as possible. A challenge is that
    // we don't know how the page will respond to reducing the width of the body.
    //
    // - The content might have margins which automatically get reduced as the
    //   available width is reduced. For example a blog post with a fixed-width
    //   article in the middle and `margin: auto` for both margins.
    //
    //   In this scenario we'd want to reduce the document width by the full
    //   width of the sidebar.
    //
    // - There might be sidebars to the left and/or right of the main content
    //   which cause the main content to be squashed when the width is reduced.
    //   For example a news website with a column of ads on the right.
    //
    //   In this scenario we'd want to not reduce the document width or reduce
    //   it by a smaller amount and let the Hypothesis sidebar cover up the
    //   document's sidebar, leaving as much space as possible to the content.
    //
    // Therefore what we do is to initially reduce the width of the document by
    // the full width of the sidebar, then we use heuristics to analyze the
    // resulting page layout and determine whether there is significant "free space"
    // (ie. anything that is not the main content of the document, such as ads or
    // links to related stories) to the right of the main content. If there is,
    // we make the document wider again to allow more space for the main content.
    //
    // These heuristics assume a typical "article" page with one central block
    // of content. If we can't find the "main content" then we just assume that
    // everything on the page is potentially content that the user might want
    // to annotate and so try to keep it all visible.
    const padding = 10;
    const width = window.innerWidth - sidebarWidth;
    const rightMargin = window.innerWidth - width + padding;

    preserveScrollPosition(() => {
      // FIXME: If there is a CSS rule that sets the `width` of the body, that
      // will override this margin. eg. There are various sites that have
      // `width: 100%` rules for the body.
      document.body.style.marginRight = `${rightMargin}px`;

      const contentArea = guessMainContentArea(document.body);
      if (contentArea) {
        // Check if we can give the main content more space by letting the
        // sidebar overlap stuff in the document to the right of the main content.
        const freeSpace = window.innerWidth - sidebarWidth - contentArea.right;
        if (freeSpace > 200) {
          document.body.style.marginRight = `${rightMargin - freeSpace}px`;
        }

        // If the main content appears to be right up against the edge of the
        // window, add padding for readability.
        if (contentArea.left < 10) {
          document.body.style.marginLeft = `${padding}px`;
        }
      }
    });
  }

  /**
   * Undo the effects of `activateSideBySide`.
   */
  _deactivateSideBySide() {
    preserveScrollPosition(() => {
      document.body.style.marginLeft = '';
      document.body.style.marginRight = '';
    });
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
