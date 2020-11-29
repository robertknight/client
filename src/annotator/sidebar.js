import Hammer from 'hammerjs';

import annotationCounts from './annotation-counts';
import sidebarTrigger from './sidebar-trigger';
import { createSidebarConfig } from './config/sidebar';
import events from '../shared/bridge-events';
import features from './features';

import Guest from './guest';
import { ToolbarController } from './toolbar';

/**
 * @typedef LayoutState
 * @prop {boolean} expanded
 * @prop {number} width
 * @prop {number} height
 */

// Minimum width to which the frame can be resized.
const MIN_RESIZE = 280;

const defaultConfig = {
  BucketBar: {
    container: '.annotator-frame',
  },
};

/**
 * Attempt to guess the region of the page that contains the main content.
 *
 * @param {Element} root
 * @return {{ left: number, right: number }|null}
 */
function guessMainContentArea(root) {
  /** @type {Map<number,number>} */
  const leftMarginVotes = new Map();

  /** @type {Map<number,number>} */
  const rightMarginVotes = new Map();

  // Get all the paragraphs of text in the document and gather statistics about them.
  const contentParagraphs = Array.from(root.querySelectorAll('p'))
    .map(p => {
      // Gather some statistics about them.
      const rect = p.getBoundingClientRect();
      return [
        /** @type {string} */ (p.textContent).length,
        rect.left,
        rect.right,
      ];
    })
    .filter(([, left, right]) => {
      // Filter out hidden or very narrow paragraphs
      return right - left > 100;
    })
    // Select the paragraphs containing the most text.
    .sort((a, b) => {
      return b[0] - a[0];
    })
    .slice(0, 15);

  // Let these paragraphs "vote" for what the left and right margins of the
  // main content area in the document are.
  contentParagraphs.forEach(([, left, right]) => {
    let leftVotes = leftMarginVotes.get(left) ?? 0;
    leftVotes += 1;
    leftMarginVotes.set(left, leftVotes);

    let rightVotes = rightMarginVotes.get(right) ?? 0;
    rightVotes += 1;
    rightMarginVotes.set(right, rightVotes);
  });

  // Find the winners of the election.
  const leftMargin = [...leftMarginVotes.entries()].sort((a, b) => b[1] - a[1]);
  const rightMargin = [...rightMarginVotes.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  if (leftMargin.length > 0 && rightMargin.length > 0) {
    const [leftPos, leftVotes] = leftMargin[0];
    const [rightPos, rightVotes] = rightMargin[0];

    const minVotes = 5;
    if (leftVotes < minVotes || rightVotes < minVotes) {
      return null;
    }

    return { left: leftPos, right: rightPos };
  } else {
    return null;
  }
}

/**
 * Apply a layout change to the document and preserve the scroll position.
 *
 * This utility tries to ensure that the same part of the document remains
 * visible on screen after the content is resized.
 *
 * @param {() => any} callback - Callback that will apply the layout change
 */
function preserveScrollPosition(callback) {
  // Element that we are going to scroll in order to keep the same content on
  // screen after the document has been resized.
  const scrollRoot = document.documentElement;

  // Find an element near the top of the screen to serve as a reference point.
  // We are currently just picking whatever element is in the middle of the screen,
  // but this should ideally be an element that will scroll together with the
  // scroll root, eg. excluding fixed elements.
  const anchorElement = document.elementFromPoint(window.innerWidth / 2, 1);
  if (!anchorElement) {
    callback();
    return;
  }

  const anchorTop = anchorElement.getBoundingClientRect().top;

  callback();

  const newAnchorTop = anchorElement.getBoundingClientRect().top;

  // Determine how far we scrolled as a result of the layout change.
  // This will be positive if the anchor element moved down or negative if it moved up.
  const scrollDelta = newAnchorTop - anchorTop;
  scrollRoot.scrollTop += scrollDelta;
}

/**
 * Create the iframe that will load the sidebar application.
 *
 * @return {HTMLIFrameElement}
 */
function createSidebarIframe(config) {
  const sidebarConfig = createSidebarConfig(config);
  const configParam =
    'config=' + encodeURIComponent(JSON.stringify(sidebarConfig));
  const sidebarAppSrc = config.sidebarAppUrl + '#' + configParam;

  const sidebarFrame = document.createElement('iframe');

  // Enable media in annotations to be shown fullscreen
  sidebarFrame.setAttribute('allowfullscreen', '');

  sidebarFrame.src = sidebarAppSrc;
  sidebarFrame.title = 'Hypothesis annotation viewer';
  sidebarFrame.className = 'h-sidebar-iframe';

  return sidebarFrame;
}

/**
 * The `Sidebar` class creates the sidebar application iframe and its container,
 * as well as the adjacent controls.
 */
export default class Sidebar extends Guest {
  constructor(element, config) {
    if (config.theme === 'clean' || config.externalContainerSelector) {
      delete config.pluginClasses.BucketBar;
    }

    let externalContainer = null;

    if (config.externalContainerSelector) {
      externalContainer = document.querySelector(
        config.externalContainerSelector
      );
    }

    let externalFrame;
    let frame;

    if (externalContainer) {
      externalFrame = externalContainer;
    } else {
      frame = document.createElement('div');
      frame.style.display = 'none';
      frame.className = 'annotator-frame annotator-outer';

      if (config.theme === 'clean') {
        frame.classList.add('annotator-frame--theme-clean');
      }

      element.appendChild(frame);
    }

    const sidebarFrame = createSidebarIframe(config);

    super(element, { ...defaultConfig, ...config });

    this.externalFrame = externalFrame;
    this.frame = frame;
    (frame || externalFrame).appendChild(sidebarFrame);

    this.subscribe('panelReady', () => {
      // Show the UI
      if (this.frame) {
        this.frame.style.display = '';
      }
    });

    this.subscribe('beforeAnnotationCreated', annotation => {
      // When a new non-highlight annotation is created, focus
      // the sidebar so that the text editor can be focused as
      // soon as the annotation card appears
      if (!annotation.$highlight) {
        /** @type {Window} */ (sidebarFrame.contentWindow).focus();
      }
    });

    if (
      config.openSidebar ||
      config.annotations ||
      config.query ||
      config.group
    ) {
      this.subscribe('panelReady', () => this.show());
    }

    if (this.plugins.BucketBar) {
      this.plugins.BucketBar.element.addEventListener('click', () =>
        this.show()
      );
    }

    // Set up the toolbar on the left edge of the sidebar.
    const toolbarContainer = document.createElement('div');
    this.toolbar = new ToolbarController(toolbarContainer, {
      createAnnotation: () => this.createAnnotation(),
      setSidebarOpen: open => (open ? this.show() : this.hide()),
      setHighlightsVisible: show => this.setAllVisibleHighlights(show),
    });
    this.toolbar.useMinimalControls = config.theme === 'clean';

    if (this.frame) {
      // If using our own container frame for the sidebar, add the toolbar to it.
      this.frame.prepend(toolbarContainer);
      this.toolbarWidth = this.toolbar.getWidth();
    } else {
      // If using a host-page provided container for the sidebar, the toolbar is
      // not shown.
      this.toolbarWidth = 0;
    }

    this._gestureState = {
      // Initial position at the start of a drag/pan resize event (in pixels).
      initial: /** @type {number|null} */ (null),

      // Final position at end of drag resize event.
      final: /** @type {number|null} */ (null),
    };
    this._setupGestures();
    this.hide();

    // Publisher-provided callback functions
    const [serviceConfig] = config.services || [];
    if (serviceConfig) {
      this.onLoginRequest = serviceConfig.onLoginRequest;
      this.onLogoutRequest = serviceConfig.onLogoutRequest;
      this.onSignupRequest = serviceConfig.onSignupRequest;
      this.onProfileRequest = serviceConfig.onProfileRequest;
      this.onHelpRequest = serviceConfig.onHelpRequest;
    }

    this.onLayoutChange = config.onLayoutChange;

    // Initial layout notification
    this._notifyOfLayoutChange(false);
    this._setupSidebarEvents();

    // Is the document currently displayed side-by-side with the sidebar?
    this.sideBySideActive = false;

    /** @type {LayoutState} */
    let lastSidebarLayoutState = {
      expanded: false,
      width: 0,
      height: 0,
    };
    this.subscribe('sidebarLayoutChanged', state => {
      lastSidebarLayoutState = state;
      this.fitSideBySide(state);
    });

    const fitSideBySideOnResize = () =>
      this.fitSideBySide(lastSidebarLayoutState);
    window.addEventListener('resize', fitSideBySideOnResize);
    this._cleanupSideBySide = () => {
      window.removeEventListener('resize', fitSideBySideOnResize);
    };
  }

  destroy() {
    this._cleanupSideBySide();
    this._hammerManager?.destroy();
    this.frame?.remove();
    super.destroy();
  }

  /**
   * Respond to the sidebar opening or document being resized by updating the
   * side-by-side mode.
   *
   * Subclasses may override `minSideBySideWidth`, `activateSideBySide` and
   * `deactivateSideBySide` to customize when side-by-side mode is activated
   * what changes are made to the document when it is.
   *
   * @param {LayoutState} layoutState
   */
  fitSideBySide(layoutState) {
    const maximumWidthToFit = window.innerWidth - layoutState.width;

    this.sideBySideActive =
      layoutState.expanded && maximumWidthToFit >= this.minSideBySideWidth();
    this.closeSidebarOnDocumentClick = !this.sideBySideActive;

    if (this.sideBySideActive) {
      this.activateSideBySide(maximumWidthToFit);
    } else {
      this.deactivateSideBySide();
    }
  }

  /**
   * Set the document body to the designated `width` and activate side-by-side mode.
   *
   * Subclasses can override this to customize how the document viewer is
   * resized when side-by-side mode is activated. If they do, they should also
   * implement `deactivateSideBySide`.
   *
   * @param {number} width - in pixels
   */
  activateSideBySide(width) {
    // When side-by-side mode is activated, what we want to achieve is that the
    // main content of the page remains fully visible afterwards and is given
    // as much space as possible. A challenge is that we don't know how the page
    // will respond to reducing the width of the body.
    //
    // - It may respond by reducing existing margins around the main content,
    //   leaving it filling more of the space outside of the sidebar
    //   For example, a page with a fixed-width article in the middle and
    //   `margin: auto` for both margins.
    //
    // - It may respond by squashing the main content to be unnecessarily
    //   narrow. For example, a news websites with a sidebar of ads on the right
    //   which remains visible after the body is resized.
    //
    // Therefore what we do is to initially reduce the width of the document to
    // a maximum of `width` pixels, then we use heuristics to determine how
    // whether there is significant "free space" (ie. anything that is not the
    // main content of the document, such as ads or links to related stories)
    // to the right of the main content. If there is, make the document wider
    // again to allow more space for the main content.
    //
    // These heuristics assume a typical "article" page with one central block
    // of content. If we can't find the "main content" then we just assume that
    // everything on the page is potentially content that the user might want
    // to annotate.
    const padding = 10;
    const rightMargin = window.innerWidth - width + padding;
    const sidebarWidth = window.innerWidth - width;

    preserveScrollPosition(() => {
      document.body.style.marginLeft = `${padding}px`;
      document.body.style.marginRight = `${rightMargin}px`;

      // TODO - Decide which elements to use _before_ applying the initial squash,
      // as the initial squash may make the content very narrow and so not look
      // like the main content. This happens on Stack Overflow for example.
      const contentArea = guessMainContentArea(document.body);
      if (contentArea) {
        const freeSpace = window.innerWidth - sidebarWidth - contentArea.right;
        if (freeSpace > 200) {
          document.body.style.marginRight = `${rightMargin - freeSpace}px`;
        }
      }
    });
  }

  /**
   * Undo the effects of `activateSideBySide`.
   */
  deactivateSideBySide() {
    preserveScrollPosition(() => {
      document.body.style.marginLeft = '';
      document.body.style.marginRight = '';
    });
  }

  /**
   * Return the minimum width that the document must have for side-by-side
   * mode to be enabled when the sidebar is open.
   *
   * Subclasses can override this to specify a different minimum width for
   * a particular document viewer.
   *
   * @return {number}
   */
  minSideBySideWidth() {
    return 400;
  }

  _setupSidebarEvents() {
    annotationCounts(document.body, this.crossframe);
    sidebarTrigger(document.body, () => this.show());
    features.init(this.crossframe);

    this.crossframe.on('showSidebar', () => this.show());
    this.crossframe.on('hideSidebar', () => this.hide());

    // Re-publish the crossframe event so that anything extending Delegator
    // can subscribe to it (without need for crossframe)
    this.crossframe.on('showNotebook', () => {
      this.hide();
      this.publish('showNotebook');
    });
    this.crossframe.on('hideNotebook', () => {
      this.show();
      this.publish('hideNotebook');
    });

    const eventHandlers = [
      [events.LOGIN_REQUESTED, this.onLoginRequest],
      [events.LOGOUT_REQUESTED, this.onLogoutRequest],
      [events.SIGNUP_REQUESTED, this.onSignupRequest],
      [events.PROFILE_REQUESTED, this.onProfileRequest],
      [events.HELP_REQUESTED, this.onHelpRequest],
    ];
    eventHandlers.forEach(([event, handler]) => {
      if (handler) {
        this.crossframe.on(event, () => handler());
      }
    });
  }

  _resetGestureState() {
    this._gestureState = { initial: null, final: null };
  }

  _setupGestures() {
    const toggleButton = this.toolbar.sidebarToggleButton;
    if (toggleButton) {
      // Prevent any default gestures on the handle.
      toggleButton.addEventListener('touchmove', e => e.preventDefault());

      this._hammerManager = new Hammer.Manager(toggleButton)
        // eslint-disable-next-line no-restricted-properties
        .on('panstart panend panleft panright', this._onPan.bind(this));
      this._hammerManager.add(
        new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL })
      );
    }
  }

  // Schedule any changes needed to update the sidebar layout.
  _updateLayout() {
    // Only schedule one frame at a time.
    if (this.renderFrame) {
      return;
    }

    // Schedule a frame.
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;

      if (
        this._gestureState.final !== this._gestureState.initial &&
        this.frame
      ) {
        const margin = /** @type {number} */ (this._gestureState.final);
        const width = -margin;
        this.frame.style.marginLeft = `${margin}px`;
        if (width >= MIN_RESIZE) {
          this.frame.style.width = `${width}px`;
        }
        this._notifyOfLayoutChange();
      }
    });
  }

  /**
   * Notify integrator when sidebar is opened, closed or resized.
   *
   * @param {boolean} [expanded] -
   *   `true` or `false` if the sidebar is being directly opened or closed, as
   *   opposed to being resized via the sidebar's drag handles
   */
  _notifyOfLayoutChange(expanded) {
    // The sidebar structure is:
    //
    // [ Toolbar    ][                                   ]
    // [ ---------- ][ Sidebar iframe container (@frame) ]
    // [ Bucket Bar ][                                   ]
    //
    // The sidebar iframe is hidden or shown by adjusting the left margin of
    // its container.

    const toolbarWidth = (this.frame && this.toolbar.getWidth()) || 0;
    const frame = this.frame || this.externalFrame;
    const rect = frame.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(frame);
    const width = parseInt(computedStyle.width);
    const leftMargin = parseInt(computedStyle.marginLeft);

    // The width of the sidebar that is visible on screen, including the
    // toolbar, which is always visible.
    let frameVisibleWidth = toolbarWidth;

    if (typeof expanded === 'boolean') {
      if (expanded) {
        frameVisibleWidth += width;
      }
    } else {
      if (leftMargin < MIN_RESIZE) {
        frameVisibleWidth -= leftMargin;
      } else {
        frameVisibleWidth += width;
      }

      // Infer expanded state based on whether at least part of the sidebar
      // frame is visible.
      expanded = frameVisibleWidth > toolbarWidth;
    }

    const layoutState = /** @type LayoutState */ ({
      expanded,
      width: expanded ? frameVisibleWidth : toolbarWidth,
      height: rect.height,
    });

    if (this.onLayoutChange) {
      this.onLayoutChange(layoutState);
    }
    this.publish('sidebarLayoutChanged', [layoutState]);
  }

  _onPan(event) {
    const frame = this.frame;
    if (!frame) {
      return;
    }

    switch (event.type) {
      case 'panstart':
        this._resetGestureState();

        // Disable animated transition of sidebar position
        frame.classList.add('annotator-no-transition');

        // Disable pointer events on the iframe.
        frame.style.pointerEvents = 'none';

        this._gestureState.initial = parseInt(
          getComputedStyle(frame).marginLeft
        );

        break;
      case 'panend':
        frame.classList.remove('annotator-no-transition');

        // Re-enable pointer events on the iframe.
        frame.style.pointerEvents = '';

        // Snap open or closed.
        if (
          this._gestureState.final === null ||
          this._gestureState.final <= -MIN_RESIZE
        ) {
          this.show();
        } else {
          this.hide();
        }
        this._resetGestureState();
        break;
      case 'panleft':
      case 'panright': {
        if (typeof this._gestureState.initial !== 'number') {
          return;
        }

        const margin = this._gestureState.initial;
        const delta = event.deltaX;
        this._gestureState.final = Math.min(Math.round(margin + delta), 0);
        this._updateLayout();
        break;
      }
    }
  }

  show() {
    this.crossframe.call('sidebarOpened');
    this.publish('sidebarOpened');

    if (this.frame) {
      const width = this.frame.getBoundingClientRect().width;
      this.frame.style.marginLeft = `${-1 * width}px`;
      this.frame.classList.remove('annotator-collapsed');
    }

    this.toolbar.sidebarOpen = true;

    if (this.options.showHighlights === 'whenSidebarOpen') {
      this.setVisibleHighlights(true);
    }

    this._notifyOfLayoutChange(true);
  }

  hide() {
    if (this.frame) {
      this.frame.style.marginLeft = '';
      this.frame.classList.add('annotator-collapsed');
    }

    this.toolbar.sidebarOpen = false;

    if (this.options.showHighlights === 'whenSidebarOpen') {
      this.setVisibleHighlights(false);
    }

    this._notifyOfLayoutChange(false);
  }

  /**
   * Hide or show highlights associated with annotations in the document.
   *
   * @param {boolean} shouldShowHighlights
   */
  setAllVisibleHighlights(shouldShowHighlights) {
    this.crossframe.call('setVisibleHighlights', shouldShowHighlights);
  }
}
