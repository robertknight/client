import debounce from 'lodash.debounce';

export const DEBOUNCE_WAIT = 40;

/** @typedef {(frame: HTMLIFrameElement) => void} FrameCallback */

/**
 * FrameObserver detects iframes added to the document.
 *
 * To enable annotation, an iframe must be opted-in by adding the
 * `enable-annotation` attribute.
 *
 * We require the `enable-annotation` attribute to avoid the overhead of loading
 * the client into frames which are not useful to annotate. See
 * https://github.com/hypothesis/client/issues/530
 */
export class FrameObserver {
  /**
   * @param {Element} element - root of the DOM subtree to watch for the addition
   *   and removal of annotatable iframes
   * @param {FrameCallback} onFrameAdded - callback fired when an annotatable iframe is added
   */
  constructor(element, onFrameAdded) {
    this._element = element;
    this._onFrameAdded = onFrameAdded;
    /** @type {Set<HTMLIFrameElement>} */
    this._annotatableFrames = new Set();
    this._isDisconnected = false;

    this._mutationObserver = new MutationObserver(
      debounce(() => {
        this._discoverFrames();
      }, DEBOUNCE_WAIT)
    );
    this._discoverFrames();
    this._mutationObserver.observe(this._element, {
      childList: true,
      subtree: true,
      attributeFilter: ['enable-annotation'],
    });
  }

  disconnect() {
    this._isDisconnected = true;
    this._mutationObserver.disconnect();
  }

  /**
   * @param {HTMLIFrameElement} frame
   */
  async _addFrame(frame) {
    this._annotatableFrames.add(frame);
    try {
      if (this._isDisconnected) {
        return;
      }
      this._onFrameAdded(frame);
    } catch (e) {
      console.warn(
        `Unable to inject the Hypothesis client (from '${document.location.href}' into a cross-origin frame '${frame.src}')`
      );
    }
  }

  /**
   * @param {HTMLIFrameElement} frame
   */
  _removeFrame(frame) {
    this._annotatableFrames.delete(frame);
  }

  _discoverFrames() {
    const frames = new Set(
      /** @type {NodeListOf<HTMLIFrameElement> } */ (
        this._element.querySelectorAll('iframe[enable-annotation]')
      )
    );

    for (let frame of frames) {
      if (!this._annotatableFrames.has(frame)) {
        this._addFrame(frame);
      }
    }
  }
}
