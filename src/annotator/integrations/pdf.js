import debounce from 'lodash.debounce';
import { render } from 'preact';
import { TinyEmitter as EventEmitter } from 'tiny-emitter';

import { anchor, describe, documentHasText } from '../anchoring/pdf';
import WarningBanner from '../components/WarningBanner';
import RenderingStates from '../pdfjs-rendering-states';
import { ListenerCollection } from '../util/listener-collection';
import { createShadowRoot } from '../util/shadow-root';

import PDFMetadata from './pdf-metadata';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').Annotator} Annotator
 * @typedef {import('../../types/annotator').HypothesisWindow} HypothesisWindow
 * @typedef {import('../../types/annotator').Selector} Selector
 */

const MIN_PDF_WIDTH = 680;

export class PDFIntegration extends EventEmitter {
  constructor() {
    super();

    const window_ = /** @type {HypothesisWindow} */ (window);
    this.pdfViewer = window_.PDFViewerApplication.pdfViewer;
    this.pdfContainer = window_.PDFViewerApplication.appConfig?.appContainer;
    this.pdfViewer.viewer.classList.add('has-transparent-text-layer');

    this.pdfMetadata = new PDFMetadata(window_.PDFViewerApplication);

    this.observer = new MutationObserver(debounce(() => this._update(), 100));
    this.observer.observe(this.pdfViewer.viewer, {
      attributes: true,
      attributeFilter: ['data-loaded'],
      childList: true,
      subtree: true,
    });

    /**
     * A banner shown at the top of the PDF viewer warning the user if the PDF
     * is not suitable for use with Hypothesis.
     *
     * @type {HTMLElement|null}
     */
    this._warningBanner = null;

    this._checkForSelectableText();

    // Hide annotation layer when the user is making a selection. The annotation
    // layer appears above the invisible text layer and can interfere with text
    // selection. See https://github.com/hypothesis/client/issues/1464.
    this._updateAnnotationLayerVisibility = () => {
      const selection = /** @type {Selection} */ (window_.getSelection());

      // Add CSS class to indicate whether there is a selection. Annotation
      // layers are then hidden by a CSS rule in `pdfjs-overrides.scss`.
      this.pdfViewer.viewer.classList.toggle(
        'is-selecting',
        !selection.isCollapsed
      );
    };

    this._listeners = new ListenerCollection();
    this._listeners.add(
      document,
      'selectionchange',
      this._updateAnnotationLayerVisibility
    );
    this.window = window;
  }

  destroy() {
    this._listeners.removeAll();
    this.pdfViewer.viewer.classList.remove('has-transparent-text-layer');
    this.observer.disconnect();
  }

  contentContainer() {
    return /** @type {HTMLElement} */ (document.querySelector(
      '#viewerContainer'
    ));
  }

  fitSideBySide(sidebarLayoutState) {
    let active;
    const maximumWidthToFit = this.window.innerWidth - sidebarLayoutState.width;
    if (sidebarLayoutState.expanded && maximumWidthToFit >= MIN_PDF_WIDTH) {
      this.pdfContainer.style.width = maximumWidthToFit + 'px';
      this.pdfContainer.classList.add('hypothesis-side-by-side');
      active = true;
    } else {
      this.pdfContainer.style.width = 'auto';
      this.pdfContainer.classList.remove('hypothesis-side-by-side');
      active = false;
    }

    // The following logic is pulled from PDF.js `webViewerResize`
    const currentScaleValue = this.pdfViewer.currentScaleValue;
    if (
      currentScaleValue === 'auto' ||
      currentScaleValue === 'page-fit' ||
      currentScaleValue === 'page-width'
    ) {
      // NB: There is logic within the setter for `currentScaleValue`
      // Setting this scale value will prompt PDF.js to recalculate viewport
      this.pdfViewer.currentScaleValue = currentScaleValue;
    }
    // This will cause PDF pages to re-render if their scaling has changed
    this.pdfViewer.update();

    return active;
  }

  uri() {
    return this.pdfMetadata.getUri();
  }

  metadata() {
    return this.pdfMetadata.getMetadata();
  }

  /**
   * @param {HTMLElement} root
   * @param {Selector[]} selectors
   */
  anchor(root, selectors) {
    return anchor(root, selectors);
  }

  /**
   * @param {HTMLElement} root
   * @param {Range} range
   */
  describe(root, range) {
    return describe(root, range);
  }

  /**
   * Check whether the PDF has selectable text and show a warning if not.
   */
  async _checkForSelectableText() {
    // Wait for PDF to load.
    try {
      await this.uri();
    } catch (e) {
      return;
    }

    try {
      const hasText = await documentHasText();
      this._showNoSelectableTextWarning(!hasText);
    } catch (err) {
      /* istanbul ignore next */
      console.warn('Unable to check for text in PDF:', err);
    }
  }

  /**
   * Set whether the warning about a PDF's suitability for use with Hypothesis
   * is shown.
   *
   * @param {boolean} showWarning
   */
  _showNoSelectableTextWarning(showWarning) {
    // Get a reference to the top-level DOM element associated with the PDF.js
    // viewer.
    const outerContainer = /** @type {HTMLElement} */ (document.querySelector(
      '#outerContainer'
    ));

    if (!showWarning) {
      this._warningBanner?.remove();
      this._warningBanner = null;

      // Undo inline styles applied when the banner is shown. The banner will
      // then gets its normal 100% height set by PDF.js's CSS.
      outerContainer.style.height = '';

      return;
    }

    this._warningBanner = document.createElement('hypothesis-banner');
    document.body.prepend(this._warningBanner);

    const warningBannerContent = createShadowRoot(this._warningBanner);
    render(<WarningBanner />, warningBannerContent);

    const bannerHeight = this._warningBanner.getBoundingClientRect().height;

    // The `#outerContainer` element normally has height set to 100% of the body.
    //
    // Reduce this by the height of the banner so that it doesn't extend beyond
    // the bottom of the viewport.
    //
    // We don't currently handle the height of the banner changing here.
    outerContainer.style.height = `calc(100% - ${bannerHeight}px)`;
  }

  // This method (re-)anchors annotations when pages are rendered and destroyed.
  _update() {
    const pageCount = this.pdfViewer.pagesCount;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = this.pdfViewer.getPageView(pageIndex);
      if (!page.textLayer?.renderingDone) {
        continue;
      }

      // Detect what needs to be done by checking the rendering state.
      switch (page.renderingState) {
        case RenderingStates.INITIAL:
          // This page has been reset to its initial state so its text layer
          // is no longer valid. Null it out so that we don't process it again.
          page.textLayer = null;
          break;
        case RenderingStates.FINISHED:
          // This page is still rendered. If it has a placeholder node that
          // means the PDF anchoring module anchored annotations before it was
          // rendered. Remove this, which will cause the annotations to anchor
          // again, below.
          {
            const placeholder = page.div.querySelector(
              '.annotator-placeholder'
            );
            placeholder?.parentNode.removeChild(placeholder);
          }
          break;
      }
    }

    this.emit('contentChanged');
  }
}
