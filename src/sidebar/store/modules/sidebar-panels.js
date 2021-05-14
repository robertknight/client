/**
 * This module handles the state for `SidebarPanel` components used in the app.
 * It keeps track of the "active" `panelName` (simple string) and allows the
 * opening, closing or toggling of panels via their `panelName`. It merely
 * retains the `panelName` state as a string: it has no understanding nor
 * opinions about whether a given `panelName` corresponds to one or more
 * extant `SidebarPanel` components. Only one panel (as keyed by `panelName`)
 * may be "active" (open) at one time.
 */

import { createStoreModule } from '../create-store';

/**
 * @typedef {import("../../../types/sidebar").PanelName} PanelName
 */

/**
 * @typedef State
 * @prop {PanelName|null} activePanelName
 */

/** @type {State} */
const initialState = { activePanelName: null };

export default createStoreModule(initialState, {
  namespace: 'sidebarPanels',

  actions: {
    /**
     * @param {PanelName} panelName
     */
    openSidebarPanel(state, panelName) {
      return { activePanelName: panelName };
    },

    /**
     * @param {PanelName} panelName
     */
    closeSidebarPanel(state, panelName) {
      let activePanelName = state.activePanelName;
      if (panelName === activePanelName) {
        // `action.panelName` is indeed the currently-active panel; deactivate
        activePanelName = null;
      }
      // `action.panelName` is not the active panel; nothing to do here
      return {
        activePanelName,
      };
    },

    /**
     * @param {PanelName} panelName
     * @param {boolean} [panelState]
     */
    toggleSidebarPanel(state, panelName, panelState) {
      let activePanelName;
      // Is the panel in question currently the active panel?
      const panelIsActive = state.activePanelName === panelName;
      // What state should the panel in question move to next?
      const panelShouldBeActive =
        typeof panelState !== 'undefined' ? panelState : !panelIsActive;

      if (panelShouldBeActive) {
        // If the specified panel should be open (active), set it as active
        activePanelName = panelName;
      } else if (panelIsActive && !panelShouldBeActive) {
        // If the specified panel is currently open (active), but it shouldn't be anymore
        activePanelName = null;
      } else {
        // This panel is already inactive; do nothing
        activePanelName = state.activePanelName;
      }

      return {
        activePanelName,
      };
    },
  },

  selectors: {
    /**
     * Is the panel indicated by `panelName` currently active (open)?
     *
     * @param {PanelName} panelName
     */
    isSidebarPanelOpen(state, panelName) {
      return state.activePanelName === panelName;
    },
  },
});
