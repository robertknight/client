import { createSelector } from 'reselect';

import { createStoreModule } from '../create-store';
import session from './session';

/**
 * @typedef {import('../../../types/api').Group} Group
 */

const initialState = {
  /**
   * List of groups.
   * @type {Group[]}
   */
  groups: [],

  /**
   * ID of currently selected group.
   * @type {string|null}
   */
  focusedGroupId: null,
};

/**
 * Return groups the user isn't a member of that are scoped to the URI.
 *
 * @type {(state: any) => Group[]}
 */
const getFeaturedGroups = createSelector(
  state => state.groups,
  groups => groups.filter(group => !group.isMember && group.isScopedToUri)
);

/**
 * Return groups the logged in user is a member of.
 *
 * @type {(state: any) => Group[]}
 */
const getMyGroups = createSelector(
  rootState => rootState.groups.groups,
  rootState => session.selectors.isLoggedIn(rootState.session),
  (groups, loggedIn) => {
    // If logged out, the Public group still has isMember set to true so only
    // return groups with membership in logged in state.
    if (loggedIn) {
      return groups.filter(g => g.isMember);
    }
    return [];
  }
);

/**
 * Return groups that don't show up in Featured and My Groups.
 *
 * @type {(state: any) => Group[]}
 */
const getCurrentlyViewingGroups = createSelector(
  rootState => rootState.groups.groups,
  rootState => getMyGroups(rootState),
  rootState => getFeaturedGroups(rootState.groups),
  (allGroups, myGroups, featuredGroups) => {
    return allGroups.filter(
      g => !myGroups.includes(g) && !featuredGroups.includes(g)
    );
  }
);

export default createStoreModule(initialState, {
  namespace: 'groups',
  actions: {
    /**
     * Set the current focused group.
     *
     * @param {string} id
     */
    focusGroup(state, id) {
      const group = state.groups.find(g => g.id === id);
      if (!group) {
        console.error(`Attempted to focus group ${id} which is not loaded`);
        return {};
      }
      return { focusedGroupId: id };
    },

    /**
     * Update the set of loaded groups.
     *
     * @param {Group[]} groups
     */
    loadGroups(state, groups) {
      let focusedGroupId = state.focusedGroupId;

      // Reset focused group if not in the new set of groups.
      if (
        state.focusedGroupId === null ||
        !groups.find(g => g.id === state.focusedGroupId)
      ) {
        if (groups.length > 0) {
          focusedGroupId = groups[0].id;
        } else {
          focusedGroupId = null;
        }
      }

      return {
        focusedGroupId,
        groups,
      };
    },

    clearGroups() {
      return {
        focusedGroupId: null,
        groups: [],
      };
    },
  },

  selectors: {
    allGroups(state) {
      return state.groups;
    },

    /**
     * Return the currently focused group.
     */
    focusedGroup(state) {
      return state.groups.find(g => g.id === state.focusedGroupId) ?? null;
    },

    focusedGroupId(state) {
      return state.focusedGroupId;
    },

    /**
     * Return groups the user isn't a member of that are scoped to the URI.
     */
    getFeaturedGroups: createSelector(
      state => state.groups,
      groups => groups.filter(group => !group.isMember && group.isScopedToUri)
    ),

    /**
     * Return the group with the given ID.
     *
     * @param {string} id
     * @return {Group|undefined}
     */
    getGroup(state, id) {
      return state.groups.find(g => g.id === id);
    },

    /**
     * Return groups that are scoped to the uri. This is used to return the groups
     * that show up in the old groups menu. This should be removed once the new groups
     * menu is permanent.
     */
    getInScopeGroups: createSelector(
      state => state.groups,
      groups => groups.filter(g => g.isScopedToUri)
    ),
  },

  rootSelectors: {
    getCurrentlyViewingGroups,
    getMyGroups,
  },
});
