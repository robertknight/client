import { createStoreModule } from '../create-store';

/**
 * This module defines actions and state related to the display mode of the
 * sidebar.
 */

const initialState = {
  /**
   * Has the sidebar ever been opened? NB: This is not necessarily the
   * current state of the sidebar, but tracks whether it has ever been open.
   */
  sidebarHasOpened: false,
  visibleHighlights: false,
};

export default createStoreModule(initialState, {
  namespace: 'viewer',
  actions: {
    /**
     * @param {boolean} show
     */
    setShowHighlights(state, show) {
      return { visibleHighlights: show };
    },

    /**
     * @param {boolean} opened
     */
    setSidebarOpened(state, opened) {
      // FIXME - The `opened` argument is pointless
      if (opened) {
        return { sidebarHasOpened: opened };
      } else {
        return {};
      }
    },
  },
  selectors: {
    hasSidebarOpened(state) {
      return state.sidebarHasOpened;
    },
  },
});
