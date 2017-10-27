'use strict';

/**
 * This module manages the state relating to unsaved local edits to annotations.
 *
 * The existence of a 'draft' for an annotation implies that it is being
 * edited.  Each draft stores the tags, text and sharing changes that have not
 * yet been committed on the server.
 */

var util = require('./util');

function init() {
  return {
    drafts: [],
  };
}

function matches(draft, action) {
  return (draft.id && action.id === draft.id) ||
         (draft.$tag && action.$tag === draft.$tag);
}

function remove(drafts, action) {
  return drafts.filter(d => !matches(d, action));
}

var update = {
  UPDATE_DRAFT: (state, action) => {
    var drafts = remove(state.drafts, action);
    drafts.push({
      id: action.id,
      $tag: action.$tag,
      isPrivate: action.isPrivate,
      tags: action.tags,
      text: action.text,
    });
    return { drafts: drafts };
  },

  REMOVE_DRAFT: (state, action) => {
    var drafts = remove(state.drafts, action);
    return { drafts: drafts };
  },

  CLEAR_DRAFTS: () => {
    return { drafts: [] };
  },
};

var actions = util.actionTypes(update);

/**
 * Create or replace the draft for an annotation.
 */
function updateDraft(annotation, changes) {
  return {
    type: actions.UPDATE_DRAFT,
    id: annotation.id,
    $tag: annotation.$tag,

    isPrivate: changes.isPrivate,
    tags: changes.tags,
    text: changes.text,
  };
}

/** Remove the current draft for an annotation, if there is one. */
function removeDraft(annotation) {
  return {
    type: actions.REMOVE_DRAFT,
    id: annotation.id,
    $tag: annotation.$tag,
  };
}

/** Discard all drafts. */
function clearDrafts() {
  return { type: actions.CLEAR_DRAFTS };
}

function countDrafts(state) {
  return state.drafts.length;
}

/**
 * Return the draft for a given annotation, if any.
 */
function getDraft(state, annotation) {
  return state.drafts.find(function (d) {
    return matches(d, annotation);
  });
}

/**
 * Return drafts for annotations which have not been saved.
 */
function unsavedDrafts(state) {
  return state.drafts.filter(function (d) {
    return !d.id;
  });
}

function isDraftEmpty(draft) {
  return !draft || (!draft.text && draft.tags.length === 0);
}

module.exports = {
  init,
  update,

  actions: {
    clearDrafts,
    updateDraft,
    removeDraft,
  },

  selectors: {
    countDrafts,
    getDraft,
    unsavedDrafts,
  },

  // Helpers
  isDraftEmpty,
};
