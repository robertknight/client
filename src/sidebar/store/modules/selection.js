/**
 * This module handles the state affecting the visibility and presence of
 * annotations and threads in the UI.
 */

/**
 * @typedef {import('../../../types/api').Annotation} Annotation
 * @typedef {import("../../../types/sidebar").TabName} TabName
 *
 * @typedef {'Location'|'Oldest'|'Newest'} SortKey
 */

import { createSelector } from 'reselect';

import * as metadata from '../../helpers/annotation-metadata';
import { countIf, trueKeys, toTrueMap } from '../../util/collections';
import { createStoreModule } from '../create-store';

/**
 * Default sort keys for each tab.
 *
 * @type {Record<string, SortKey>}
 */
const TAB_SORTKEY_DEFAULT = {
  annotation: 'Location',
  note: 'Oldest',
  orphan: 'Location',
};

function initialSelection(settings) {
  /** @type {Record<string, boolean>} */
  const selection = {};
  // TODO: Do not take into account existence of `settings.query` here
  // once root-thread-building is fully updated: the decision of whether
  // selection trumps any query is not one for the store to make
  if (settings.annotations && !settings.query) {
    selection[settings.annotations] = true;
  }
  return selection;
}

/**
 * Identifier of an annotation - either its `id` or `$tag` property.
 *
 * @typedef {string} AnnotationID
 */

function initialState(settings) {
  return {
    /**
     * A set of annotations that are currently "selected" by the user —
     * these will supersede other filters/selections
     *
     * @type {Record<AnnotationID, boolean>}
     */
    selected: initialSelection(settings),

    /**
     * Explicitly-expanded or -collapsed annotations (threads). A collapsed
     * annotation thread will not show its replies; an expanded thread will
     * show its replies. Note that there are other factors affecting
     * collapsed states, e.g., top-level threads are collapsed by default
     * until explicitly expanded.
     *
     * @type {Record<AnnotationID, boolean>}
     */
    expanded: initialSelection(settings) || {},

    /**
     * Set of threads that have been "forced" visible by the user
     * (e.g. by clicking on "Show x more" button) even though they may not
     * match the currently-applied filters
     *
     * @type {Record<AnnotationID, boolean>}
     */
    forcedVisible: {},

    selectedTab: /** @type {TabName} */ ('annotation'),

    /**
     * Key by which annotations are currently sorted.
     *
     * @type {SortKey}
     */
    sortKey: TAB_SORTKEY_DEFAULT.annotation,
  };
}

/**
 *
 * @param {TabName} newTab
 * @param {TabName} oldTab
 */
const setTab = (newTab, oldTab) => {
  // Do nothing if the "new tab" is the same as the tab already selected.
  // This will avoid resetting the `sortKey`, too.
  if (oldTab === newTab) {
    return {};
  }
  return {
    selectedTab: newTab,
    sortKey: TAB_SORTKEY_DEFAULT[newTab],
  };
};

const resetSelection = () => {
  return {
    forcedVisible: {},
    selected: {},
  };
};

export default createStoreModule(initialState, {
  namespace: 'selection',

  actions: {
    clearSelection() {
      return resetSelection();
    },

    /**
     * Set the currently-selected tab to `tabKey`.
     *
     * @param {TabName} tabKey
     */
    selectTab(state, tabKey) {
      return setTab(tabKey, state.selectedTab);
    },

    /**
     * Set the expanded state for a single annotation/thread.
     *
     * @param {string} id - annotation (or thread) id
     * @param {boolean} expanded - `true` for expanded replies, `false` to collapse
     */
    setExpanded(state, id, expanded) {
      const newExpanded = { ...state.expanded };
      newExpanded[id] = expanded;
      return { expanded: newExpanded };
    },

    /**
     * A user may "force" an thread to be visible, even if it would be otherwise
     * not be visible because of applied filters. Set the force-visibility for a
     * single thread, without affecting other forced-visible threads.
     *
     * @param {string} id - Thread id
     * @param {boolean} visible - Should this annotation be visible, even if it
     *        conflicts with current filters?
     */
    setForcedVisible(state, id, visible) {
      return {
        forcedVisible: { ...state.forcedVisible, [id]: visible },
      };
    },

    /**
     * Sets the sort key for the annotation list.
     *
     * @param {SortKey} sortKey
     */
    setSortKey(state, sortKey) {
      return { sortKey };
    },

    /**
     * Toggle the selected state for the annotations in `toggledAnnotations`:
     * unselect any that are selected; select any that are unselected.
     *
     * @param {string[]} toggleIds - identifiers of annotations to toggle
     */
    toggleSelectedAnnotations(state, toggleIds) {
      const selection = { ...state.selected };
      toggleIds.forEach(id => {
        selection[id] = !selection[id];
      });
      return { selected: selection };
    },

    /**
     * Internal: Update the current selection.
     *
     * @param {Record<string, boolean>} selected
     */
    _updateSelection(state, selected) {
      return { selected };
    },
  },

  actionCreators: {
    /**
     * Set the currently selected annotation IDs. This will replace the current
     * selection. All provided annotation ids will be set to `true` in the selection.
     *
     * @param {string[]} ids - Identifiers of annotations to select
     */
    selectAnnotations(ids) {
      return dispatch => {
        dispatch({ type: 'selection/clearSelection', payload: [] });
        dispatch({
          type: 'selection/_updateSelection',
          payload: [toTrueMap(ids)],
        });
      };
    },
  },

  reducers: {
    /**
     * Automatically select the Page Notes tab, for convenience, if all of the
     * top-level annotations in `action.annotations` are Page Notes and the
     * previous annotation count was 0 (i.e. collection empty).
     */
    ADD_ANNOTATIONS(state, action) {
      const topLevelAnnotations = action.annotations.filter(
        annotation => !metadata.isReply(annotation)
      );
      const noteCount = countIf(action.annotations, metadata.isPageNote);

      const haveOnlyPageNotes = noteCount === topLevelAnnotations.length;
      if (action.currentAnnotationCount === 0 && haveOnlyPageNotes) {
        return setTab('note', state.selectedTab);
      }
      return {};
    },

    REMOVE_ANNOTATIONS(state, action) {
      let newTab = state.selectedTab;
      // If the orphans tab is selected but no remaining annotations are orphans,
      // switch back to annotations tab
      if (
        newTab === 'orphan' &&
        countIf(action.remainingAnnotations, metadata.isOrphan) === 0
      ) {
        newTab = 'annotation';
      }

      const removeAnns = collection => {
        action.annotationsToRemove.forEach(annotation => {
          if (annotation.id) {
            delete collection[annotation.id];
          }
          if (annotation.$tag) {
            delete collection[annotation.$tag];
          }
        });
        return collection;
      };
      return {
        ...setTab(newTab, state.selectedTab),
        expanded: removeAnns({ ...state.expanded }),
        forcedVisible: removeAnns({ ...state.forcedVisible }),
        selected: removeAnns({ ...state.selected }),
      };
    },

    'filters/changeFocusModeUser'() {
      return resetSelection();
    },

    'filters/setFilter'() {
      return { ...resetSelection(), expanded: {} };
    },

    'filters/setFilterQuery'() {
      return { ...resetSelection(), expanded: {} };
    },

    'filters/toggleFocusMode'() {
      return resetSelection();
    },
  },

  selectors: {
    /**
     * Retrieve map of expanded/collapsed annotations (threads)
     *
     * @return {Object<string,boolean>}
     */
    expandedMap(state) {
      return state.expanded;
    },

    forcedVisibleThreads: createSelector(
      state => state.forcedVisible,
      forcedVisible => trueKeys(forcedVisible)
    ),

    hasSelectedAnnotations: createSelector(
      state => state.selected,
      selection => trueKeys(selection).length > 0
    ),

    selectedAnnotations: createSelector(
      state => state.selected,
      selection => trueKeys(selection)
    ),

    selectedTab(state) {
      return state.selectedTab;
    },

    selectionState: createSelector(
      state => state,
      state => {
        return {
          expanded: state.expanded,
          forcedVisible: trueKeys(state.forcedVisible),
          selected: trueKeys(state.selected),
          sortKey: state.sortKey,
          selectedTab: state.selectedTab,
        };
      }
    ),

    sortKey(state) {
      return state.sortKey;
    },

    /**
     * Retrieve applicable sort options for the currently-selected tab.
     */
    sortKeys: createSelector(
      state => state.selectedTab,
      selectedTab => {
        const sortKeysForTab = ['Newest', 'Oldest'];
        if (selectedTab !== 'note') {
          // Location is inapplicable to Notes tab
          sortKeysForTab.push('Location');
        }
        return sortKeysForTab;
      }
    ),
  },
});
