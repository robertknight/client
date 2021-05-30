import { createSelector } from 'reselect';

import { createStoreModule } from '../create-store';

/** @typedef {import('../../../types/api').Annotation} Annotation */

/**
 * The drafts store provides temporary storage for unsaved edits to new or
 * existing annotations.
 */

/**
 * Object containing only the ID fields from `Annotation`
 *
 * @typedef AnnotationID
 * @prop {string} [id]
 * @prop {string} $tag
 */

/**
 * Contents of a draft
 *
 * @typedef DraftContent
 * @prop {boolean} isPrivate
 * @prop {string} text
 * @prop {string[]} tags
 */

/**
 * Helper class to encapsulate the draft properties and a few simple methods.
 */
export class Draft {
  /**
   * @param {AnnotationID} annotation
   * @param {DraftContent} changes
   */
  constructor(annotation, changes) {
    /** @type {AnnotationID} */
    this.annotation = { id: annotation.id, $tag: annotation.$tag };
    this.isPrivate = changes.isPrivate;
    this.tags = changes.tags;
    this.text = changes.text;
  }
  /**
   * Returns true if this draft matches a given annotation.
   *
   * Annotations are matched by ID or local tag.
   *
   * @param {AnnotationID} annotation
   */
  match(annotation) {
    return (
      (this.annotation.$tag && annotation.$tag === this.annotation.$tag) ||
      (this.annotation.id && annotation.id === this.annotation.id)
    );
  }
  /**
   * Return true if this draft is empty and can be discarded without losing
   * any user input.
   */
  isEmpty() {
    return !this.text && this.tags.length === 0;
  }
}

/** @type {Draft[]} */
const initialState = [];

export default createStoreModule(initialState, {
  namespace: 'drafts',
  actions: {
    /**
     * Remove any drafts that are empty.
     *
     * An empty draft has no text and no reference tags.
     */
    deleteNewAndEmptyDrafts(state) {
      // FIXME - Make sure that any removed drafts are also removed from the
      // annotations state.
      return state.filter(draft => draft.annotation.id || !draft.isEmpty());
    },

    /**
     * Create or update the draft version for a given annotation by
     * replacing any existing draft or simply creating a new one.
     *
     * @param {AnnotationID} annotation
     * @param {DraftContent} changes
     */
    createDraft(state, annotation, changes) {
      return state
        .filter(draft => !draft.match(annotation))
        .concat(new Draft(annotation, changes));
    },

    discardAllDrafts() {
      return [];
    },

    /** @param {Annotation} annotation */
    removeDraft(state, annotation) {
      return state.filter(draft => !draft.match(annotation));
    },
  },

  selectors: {
    /**
     * Returns the number of drafts - both unsaved new annotations, and unsaved
     * edits to saved annotations - currently stored.
     */
    countDrafts(state) {
      return state.length;
    },

    /**
     * Retrieve the draft changes for an annotation.
     *
     * @param {AnnotationID} annotation
     */
    getDraft(state, annotation) {
      return state.find(draft => draft.match(annotation)) ?? null;
    },

    /**
     * Returns the draft changes for an annotation, or null if no draft exists
     * or the draft is empty.
     *
     * @param {AnnotationID} annotation
     */
    getDraftIfNotEmpty(state, annotation) {
      return (
        state.find(draft => draft.match(annotation) && !draft.isEmpty()) ?? null
      );
    },

    /**
     * Returns a list of draft annotations which have no id.
     *
     * @type {(state: Readonly<typeof initialState>) => AnnotationID[]}
     */
    unsavedAnnotations: createSelector(
      state => state,
      drafts => drafts.filter(d => !d.annotation.id).map(d => d.annotation)
    ),
  },
});
