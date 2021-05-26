/**
 * Store module which tracks activity happening in the application that may
 * need to be reflected in the UI.
 */

import { createStoreModule } from '../create-store';

const initialState = {
  /**
   * Annotation `$tag`s that correspond to annotations with active API requests
   *
   * @type {string[]}
   */
  activeAnnotationSaveRequests: [],
  /**
   * The number of API requests that have started and not yet completed.
   */
  activeApiRequests: 0,
  /**
   * The number of annotation fetches that have started and not yet completed.
   */
  activeAnnotationFetches: 0,
  /**
   * Have annotations ever been fetched?
   */
  hasFetchedAnnotations: false,
  /**
   * The number of total annotation results the service reported as
   * matching the most recent load/search request
   *
   * @type {number|null}
   */
  annotationResultCount: null,
};

/** @typedef {import('../../../types/api').Annotation} Annotation */

export default createStoreModule(initialState, {
  namespace: 'activity',

  actions: {
    annotationFetchStarted(state) {
      return { activeAnnotationFetches: state.activeAnnotationFetches + 1 };
    },

    annotationFetchFinished(state) {
      if (state.activeAnnotationFetches === 0) {
        throw new Error(
          'ANNOTATION_FETCH_FINISHED action when no annotation fetches were active'
        );
      }
      return {
        activeAnnotationFetches: state.activeAnnotationFetches - 1,
        hasFetchedAnnotations: true,
      };
    },

    /**
     * @param {Annotation} annotation
     */
    annotationSaveStarted(state, annotation) {
      let addToStarted = [];
      if (
        annotation.$tag &&
        !state.activeAnnotationSaveRequests.includes(annotation.$tag)
      ) {
        addToStarted.push(annotation.$tag);
      }
      const updatedSaves =
        state.activeAnnotationSaveRequests.concat(addToStarted);
      return {
        ...state,
        activeAnnotationSaveRequests: updatedSaves,
      };
    },

    /**
     * @param {Annotation} annotation
     */
    annotationSaveFinished(state, annotation) {
      const updatedSaves = state.activeAnnotationSaveRequests.filter(
        $tag => $tag !== annotation.$tag
      );
      return {
        activeAnnotationSaveRequests: updatedSaves,
      };
    },

    apiRequestStarted(state) {
      return { activeApiRequests: state.activeApiRequests + 1 };
    },

    apiRequestFinished(state) {
      if (state.activeApiRequests === 0) {
        throw new Error(
          '`apiRequestFinished` action when no requests were active'
        );
      }

      return {
        activeApiRequests: state.activeApiRequests - 1,
      };
    },

    /**
     * @param {number} resultCount
     */
    setAnnotationResultCount(state, resultCount) {
      return { annotationResultCount: resultCount };
    },
  },

  selectors: {
    hasFetchedAnnotations(state) {
      return state.hasFetchedAnnotations;
    },

    /**
     * Return true when any activity is happening in the app that needs to complete
     * before the UI is ready for interactivity with annotations.
     */
    isLoading(state) {
      return state.activeApiRequests > 0 || !state.hasFetchedAnnotations;
    },

    /**
     * Return true when annotations are actively being fetched.
     */
    isFetchingAnnotations(state) {
      return state.activeAnnotationFetches > 0;
    },

    /**
     * Return `true` if `$tag` exists in the array of annotation `$tag`s that
     * have in-flight save requests, i.e. the annotation in question is actively
     * being saved to a remote service.
     *
     * @param {Annotation} annotation
     */
    isSavingAnnotation(state, annotation) {
      if (!annotation.$tag) {
        return false;
      }
      return state.activeAnnotationSaveRequests.includes(annotation.$tag);
    },

    annotationResultCount(state) {
      return state.annotationResultCount;
    },
  },
});
