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
 *
 * @typedef DragResizeState
 * @prop {number} frameWidth - Frame width when drag resize started
 * @prop {number} pointerClientX - Pointer position when drag resize started
 * @prop {() => void} reset -
 *   Undo temporary changes to the document made when the drag-resize started
 */

// Minimum width to which the frame can be resized.
const MIN_RESIZE = 280;

const defaultConfig = {
  BucketBar: {
    container: '.annotator-frame',
  },
};

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

    /** @type {DragResizeState|null} */
    this._dragResizeState = null;
    this._endDragResize = this._endDragResize.bind(this);

    // Set up the toolbar on the left edge of the sidebar.
    const toolbarContainer = document.createElement('div');
    this.toolbar = new ToolbarController(toolbarContainer, {
      createAnnotation: () => this.createAnnotation(),
      setSidebarOpen: open => {
        if (open) {
          this.show();
        } else {
          this.hide();
        }
      },
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

    this._setupDragResize();
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
  }

  destroy() {
    this.frame?.remove();
    super.destroy();
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

  _setupDragResize() {
    if (!this.frame) {
      return;
    }
    const frame = this.frame;

    /**
     * @param {PointerEvent} event
     */
    const onDragResize = event => {
      if (!this._dragResizeState) {
        return;
      }
      event.preventDefault();

      const deltaX = this._dragResizeState.pointerClientX - event.clientX;
      const minWidth = MIN_RESIZE;
      const maxWidth = 600;
      const width = Math.min(
        Math.max(this._dragResizeState.frameWidth + deltaX, minWidth),
        maxWidth
      );

      frame.style.width = `${width}px`;
      frame.style.marginLeft = `${-width}px`;
    };

    // Listen for sidebar toggle button being dragged to start a drag-resize.
    this.toolbar.sidebarToggleButton.addEventListener('pointermove', e => {
      if (
        e.buttons === 0 || // No buttons pressed.
        !this.isOpen() ||
        !this.frame || // Using an externally-managed container.
        this._dragResizeState // Drag resize already active.
      ) {
        return;
      }

      // Disable animated change of sidebar position during drag.
      frame.classList.add('annotator-no-transition');

      // Prevent pointer events from being consumed by the sidebar iframe
      // during the drag, as this prevents the top frame from getting them.
      frame.style.pointerEvents = 'none';

      // Disable default browser handling (eg. panning) during drag.
      document.body.style.touchAction = 'none';

      this._dragResizeState = {
        frameWidth: this.frame.getBoundingClientRect().width,
        pointerClientX: e.clientX,
        reset: () => {
          frame.classList.remove('annotator-no-transition');
          frame.style.pointerEvents = '';
          document.body.style.touchAction = '';
          document.body.removeEventListener('pointermove', onDragResize);
          document.body.removeEventListener('pointerup', this._endDragResize);
        },
      };

      document.body.addEventListener('pointermove', onDragResize);
      document.body.addEventListener('pointerup', this._endDragResize);
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
    this._endDragResize();

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

  isOpen() {
    return this.toolbar.sidebarOpen;
  }

  /**
   * Hide or show highlights associated with annotations in the document.
   *
   * @param {boolean} shouldShowHighlights
   */
  setAllVisibleHighlights(shouldShowHighlights) {
    this.crossframe.call('setVisibleHighlights', shouldShowHighlights);
  }

  _endDragResize() {
    if (!this._dragResizeState) {
      return;
    }
    this._dragResizeState.reset();
    this._dragResizeState = null;
    document.body.addEventListener('click', e => e.stopPropagation(), {
      capture: true,
      once: true,
    });
  }
}
