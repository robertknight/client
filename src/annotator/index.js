/* global process */

/**
 * @typedef {import('../types/annotator').HypothesisWindow} HypothesisWindow
 */

// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';

// Enable debug checks for Preact components.
if (process.env.NODE_ENV !== 'production') {
  require('preact/debug');
}

// Load icons.
import { registerIcons } from '@hypothesis/frontend-shared';
import iconSet from './icons';
registerIcons(iconSet);

import configFrom from './config/index';
import Guest from './guest';
import { HTMLIntegration } from './integrations/html';
import { PDFIntegration } from './integrations/pdf';
import Notebook from './notebook';
import Sidebar from './sidebar';
import { EventBus } from './util/emitter';

const window_ = /** @type {HypothesisWindow} */ (window);

// Look up the URL of the sidebar. This element is added to the page by the
// boot script before the "annotator" bundle loads.
const appLinkEl = /** @type {Element} */ (document.querySelector(
  'link[type="application/annotator+html"][rel="sidebar"]'
));

const config = configFrom(window);

function init() {
  const isPDF = typeof window_.PDFViewerApplication !== 'undefined';

  const integration = isPDF ? new PDFIntegration() : new HTMLIntegration();

  if (config.subFrameIdentifier) {
    // Other modules use this to detect if this
    // frame context belongs to hypothesis.
    // Needs to be a global property that's set.
    window_.__hypothesis_frame = true;
  }

  // Load the PDF anchoring/metadata integration.
  config.documentType = isPDF ? 'pdf' : 'html';

  const eventBus = new EventBus();
  const guest = new Guest(document.body, eventBus, integration, config);
  const sidebar = config.subFrameIdentifier
    ? null
    : new Sidebar(document.body, eventBus, guest, config);
  const notebook = new Notebook(document.body, eventBus, config);

  appLinkEl.addEventListener('destroy', () => {
    sidebar?.destroy();
    notebook.destroy();
    guest.destroy();

    // Remove all the `<link>`, `<script>` and `<style>` elements added to the
    // page by the boot script.
    const clientAssets = document.querySelectorAll('[data-hypothesis-asset]');
    clientAssets.forEach(el => el.remove());
  });
}

/**
 * Returns a Promise that resolves when the document has loaded (but subresources
 * may still be loading).
 * @returns {Promise<void>}
 */
function documentReady() {
  return new Promise(resolve => {
    if (document.readyState !== 'loading') {
      resolve();
    }
    // nb. `readystatechange` may be emitted twice, but `resolve` only resolves
    // on the first call.
    document.addEventListener('readystatechange', () => resolve());
  });
}

documentReady().then(init);
