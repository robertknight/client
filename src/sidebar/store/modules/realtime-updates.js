'use strict';

/**
 * Manage state for updates received via the Web Socket which have not
 * yet been applied.
 */

var { actions: { addAnnotations, removeAnnotations } } = require('./annotations');
var util = require('./util');

/**
 * Return a copy of `obj` retaining only keys that pass the `filterFn`
 *
 * @param {Object} obj - Object to shallow clone
 * @param {(key: string) => boolean} - Filter function
 * @return {Object}
 */
function filterKeys(obj, filterFn) {
  var result = Object.assign({}, obj);
  for (var k in obj) {
    if (!filterFn(k)) {
      delete result[k];
    }
  }
  return result;
}

function init() {
  return {
    // Map of ID -> updated annotation for updates that have been received over
    // the WS but not yet applied
    pendingUpdates: {},
    // Set of IDs of annotations which have been deleted but for which the
    // deletion has not yet been applied
    pendingDeletions: {},
  };
}

var update = {
  ADD_PENDING_UPDATE: (state, action) => {
    var pendingDeletions = state.pendingDeletions;
    var pendingUpdates = Object.assign({}, state.pendingUpdates, {
      [action.update.id]: action.update,
    });
    return { pendingUpdates, pendingDeletions };
  },

  ADD_PENDING_DELETION: (state, action) => {
    var pendingUpdates = state.pendingUpdates;
    var pendingDeletions = Object.assign({}, state.pendingDeletions, {
      [action.id]: true,
    });
    return { pendingUpdates, pendingDeletions };
  },

  CLEAR_PENDING_UPDATES: () => {
    return init();
  },

  ADD_ANNOTATIONS: (state, action) => {
    var ids = action.annotations.map(ann => ann.id);
    return {
      pendingDeletions: state.pendingDeletions,
      pendingUpdates: filterKeys(state.pendingUpdates, id => ids.indexOf(id) !== -1),
    };
  },

  REMOVE_ANNOTATIONS: (state, action) => {
    var ids = action.annotations.map(ann => ann.id);
    return {
      pendingUpdates: filterKeys(state.pendingUpdates, id => ids.indexOf(id) !== -1),
      pendingDeletions: filterKeys(state.pendingDeletions, id => ids.indexOf(id) !== -1),
    };
  },

  FOCUS_GROUP: () => {
    return init();
  },
};

var actions = util.actionTypes(update);

/**
 * Add a pending annotation update.
 *
 * @param {Annotation} update
 */
function addPendingUpdate(update) {
  return {
    type: actions.ADD_PENDING_UPDATE,
    update,
  };
}

/**
 * Record an annotation that was deleted on the server.
 *
 * @param {string} id
 */
function addPendingDeletion(id) {
  return {
    type: actions.ADD_PENDING_DELETION,
    id,
  };
}

/**
 * Discard all pending updates.
 */
function clearPendingUpdates() {
  return { type: actions.CLEAR_PENDING_UPDATES };
}

/**
 * Apply pending updates & deletions to the current set of annotations.
 */
function applyPendingUpdates() {
  return (dispatch, getState) => {
    var { pendingUpdates, pendingDeletions } = getState().realtimeUpdates;
    var updatedAnns = Object.keys(pendingUpdates).map(id => pendingUpdates[id]);
    var deletedAnns = Object.keys(pendingDeletions).map(id => ({ id }));

    dispatch(addAnnotations(updatedAnns));
    dispatch(removeAnnotations(deletedAnns));
    dispatch(clearPendingUpdates());
  };
}

/**
 * Return the total number of annotations with un-applied updates.
 */
function pendingUpdateCount(ctx) {
  var { pendingUpdates, pendingDeletions } = ctx.state;
  return Object.keys(pendingUpdates).length +
         Object.keys(pendingDeletions).length;
}

/**
 * Return true if annotation `id` was deleted but the change has not been
 * applied.
 *
 * @param {string} id
 */
function hasPendingDeletion(ctx, id) {
  return !!ctx.state.pendingDeletions[id];
}

module.exports = {
  init,
  update,
  actions: {
    addPendingUpdate,
    addPendingDeletion,
    clearPendingUpdates,
    applyPendingUpdates,
  },
  selectors: {
    pendingUpdateCount,
    hasPendingDeletion,
  },
  isModule: true,
};
