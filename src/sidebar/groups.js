/**
 * @ngdoc service
 * @name  groups
 *
 * @description Provides access to the list of groups that the user is currently
 *              a member of and the currently selected group in the UI.
 *
 *              The list of groups is initialized from the session state
 *              and can then later be updated using the add() and remove()
 *              methods.
 */
'use strict';

var STORAGE_KEY = 'hypothesis.groups.focus';

// @ngInject
function groups(annotationUI, localStorage, serviceUrl, $rootScope, apiClient) {

  function all() {
    return annotationUI.allGroups();
  }

  /**
   * Return the group with the given `id`.
   */
  function get(id) {
    return annotationUI.getGroup(id);
  }

  /**
   * Return the group that is currently focused in the drop-down menu.
   */
  function focused() {
    return annotationUI.focusedGroup();
  }

  /**
   * Leave the group with the given ID.
   * Returns a promise which resolves when the action completes.
   */
  function leave(id) {
    // The groups list will be updated in response to a session state
    // change notification from the server. We could improve the UX here
    // by optimistically updating the session state
    return apiClient.group.member.delete({
      pubid: id,
      user: 'me',
    });
  }

  /** Set the group with the passed id as the currently focused group. */
  function focus(id) {
    annotationUI.focusGroup(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  // When groups are loaded, focus the group that was last-focused in the
  // previous session, if it exists.
  annotationUI.watch(all, groups => {
    var focusedGroup = focused();
    if (!focusedGroup) {
      return;
    }

    var lastFocusedGroupId = localStorage.getItem(STORAGE_KEY);
    if (lastFocusedGroupId === focusedGroup.id) {
      return;
    }

    var group = groups.find(g => g.id === lastFocusedGroupId);
    if (group) {
      annotationUI.focusGroup(group.id);
    }
  });

  return {
    all,
    get,
    focused,
    leave,
    focus,
  };
}

module.exports = groups;
