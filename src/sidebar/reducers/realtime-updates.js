'use strict';

/**
 * Manage state for updates received via the Web Socket which have not
 * yet been applied.
 */

var util = require('./util');
var { filterMap } = require('../util/array-util');

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
    realtimeUpdates: {
      // Map of ID -> updated annotation for updates that have been received over
      // the WS but not yet applied
      pendingUpdates: {},
      // Set of IDs of annotations which have been deleted but for which the
      // deletion has not yet been applied
      pendingDeletions: {},
    },
  };
}

var update = {
  ADD_PENDING_UPDATE: (state, action) => {
    var pendingUpdates = Object.assign({}, state.realtimeUpdates.pendingUpdates, {
      [action.update.id]: action.update,
    });
    return {
      realtimeUpdates: Object.assign({}, state.realtimeUpdates, {
        pendingUpdates,
      }),
    };
  },

  ADD_PENDING_DELETION: (state, action) => {
    var pendingDeletions = Object.assign({}, state.realtimeUpdates.pendingDeletions, {
      [action.id]: true,
    });
    return {
      realtimeUpdates: Object.assign({}, state.realtimeUpdates, {
        pendingDeletions,
      }),
    };
  },

  APPLY_PENDING_UPDATES: (state) => {
    var { pendingUpdates, pendingDeletions } = state.realtimeUpdates;
    var { realtimeUpdates } = init();

    var annotations = filterMap(state.annotations, ann => {
      if (pendingDeletions[ann.id]) {
        return null;
      }
      if (pendingUpdates[ann.id]) {
        return pendingUpdates[ann.id];
      }
      return ann;
    });

    return {
      annotations,
      realtimeUpdates,
    };
  },

  ADD_ANNOTATIONS: (state, action) => {
    var { pendingUpdates } = state.realtimeUpdates;
    var ids = action.annotations.map(ann => ann.id);
    var realtimeUpdates = Object.assign(state.realtimeUpdates, {
      pendingUpdates: filterKeys(pendingUpdates, id => ids.indexOf(id) !== -1),
    });
    return { realtimeUpdates };
  },

  REMOVE_ANNOTATIONS: (state, action) => {
    var { pendingUpdates, pendingDeletions } = state.realtimeUpdates;
    var ids = action.annotations.map(ann => ann.id);
    var realtimeUpdates = Object.assign(state.realtimeUpdates, {
      pendingUpdates: filterKeys(pendingUpdates, id => ids.indexOf(id) !== -1),
      pendingDeletions: filterKeys(pendingDeletions, id => ids.indexOf(id) !== -1),
    });
    return { realtimeUpdates };
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
 * Apply pending updates & deletions to the current set of annotations.
 */
function applyPendingUpdates() {
  return { type: actions.APPLY_PENDING_UPDATES };
}

/**
 * Return the total number of annotations with un-applied updates.
 */
function pendingUpdateCount(state) {
  var { pendingUpdates, pendingDeletions } = state.realtimeUpdates;
  return Object.keys(pendingUpdates).length +
         Object.keys(pendingDeletions).length;
}

/**
 * Return true if annotation `id` was deleted but the change has not been
 * applied.
 *
 * @param {string} id
 */
function hasPendingDeletion(state, id) {
  return !!state.realtimeUpdates.pendingDeletions[id];
}

module.exports = {
  init,
  update,
  actions: {
    addPendingUpdate,
    addPendingDeletion,
    applyPendingUpdates,
  },
  selectors: {
    pendingUpdateCount,
    hasPendingDeletion,
  },
};
