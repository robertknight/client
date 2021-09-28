/**
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * HypothesisInjector has logic for injecting Hypothesis client into iframes that
 * are added to the page if (1) they have the `enable-annotation` attribute set
 * and (2) are same-origin with the current document.
 */
export class HypothesisInjector {
  /**
   * @param {Record<string, any>} config - Annotator configuration that is
   *   injected, along with the Hypothesis client, into the child iframes
   */
  constructor(config) {
    this._config = config;
  }

  /**
   * Inject Hypothesis client into a iframe.
   *
   * IMPORTANT: This method requires that the iframe is "accessible"
   * (frame.contentDocument|contentWindow is not null) and "ready" (DOM content
   * has been loaded and parsed) before the method is called.
   *
   * @param {HTMLIFrameElement} frame
   */
  async injectClient(frame) {
    await onDocumentReady(frame);

    if (hasHypothesis(frame)) {
      return;
    }

    // Generate a random string to use as a frame ID. The format is not important.
    const subFrameIdentifier = Math.random().toString().replace(/\D/g, '');
    const injectedConfig = {
      ...this._config,
      subFrameIdentifier,
    };

    const { clientUrl } = this._config;
    injectHypothesis(frame, clientUrl, injectedConfig);
  }
}

/**
 * Check if the Hypothesis client has already been injected into an iframe
 *
 * @param {HTMLIFrameElement} iframe
 */
function hasHypothesis(iframe) {
  const iframeWindow = /** @type {Window} */ (iframe.contentWindow);
  return '__hypothesis' in iframeWindow;
}

/**
 * Inject the client's boot script into the iframe. The iframe must be from the
 * same origin as the current window.
 *
 * @param {HTMLIFrameElement} iframe
 * @param {string} scriptSrc
 * @param {Record<string, any>} config
 */
function injectHypothesis(iframe, scriptSrc, config) {
  const configElement = document.createElement('script');
  configElement.className = 'js-hypothesis-config';
  configElement.type = 'application/json';
  configElement.innerText = JSON.stringify(config);

  const bootScript = document.createElement('script');
  bootScript.async = true;
  bootScript.src = scriptSrc;

  const iframeDocument = /** @type {Document} */ (iframe.contentDocument);
  iframeDocument.body.appendChild(configElement);
  iframeDocument.body.appendChild(bootScript);
}

/**
 * Resolves a Promise when the iframe's document is ready (loaded and parsed)
 *
 * @param {HTMLIFrameElement} frame
 * @return {Promise<void>}
 * @throws {Error} if trying to access a document from a cross-origin iframe
 */
export function onDocumentReady(frame) {
  return new Promise(resolve => {
    // @ts-expect-error
    const frameDocument = frame.contentWindow.document;
    const { readyState, location } = frameDocument;

    // Web browsers initially load a blank document before the final document.
    // This blank document is (1) accessible, (2) has an empty body and head,
    // and (3) has a 'complete' readyState, on Chrome and Safari, and an
    // 'uninitialized' readyState on Firefox. If a blank document is detected and
    // there is a 'src' attribute, it is expected that the blank document will be
    // replaced by the final document.
    if (
      location.href === 'about:blank' &&
      frame.hasAttribute('src') &&
      frame.src !== 'about:blank'
    ) {
      // Unfortunately, listening for 'DOMContentLoaded' on the iframeDocument
      // doesn't work. Instead, we need to wait for a 'load' event to be triggered.
      frame.addEventListener('load', () => {
        resolve();
      });
      return;
    }

    if (readyState === 'loading') {
      frameDocument.addEventListener('DOMContentLoaded', () => resolve());
      return;
    }

    // State is 'interactive' or 'complete';
    resolve();
  });
}
