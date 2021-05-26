import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
} from 'reselect';
import shallowEqual from 'shallowequal';

import { createStoreModule } from '../create-store';

/**
 * @typedef {import('../../../types/annotator').DocumentMetadata} DocumentMetadata
 */

/**
 * @typedef Frame
 * @prop {string|null} id
 *   - Sub-frames will all have a id (frame identifier) set. The main frame's id is always `null`
 * @prop {DocumentMetadata} metadata - Metadata about the document currently loaded in this frame
 * @prop {string} uri - Current primary URI of the document being displayed
 */

/**
 * The list of frames connected to the sidebar app
 *
 * @type {Frame[]}
 */
const initialState = [];

/**
 * @param {Frame} frame
 */
function searchUrisForFrame(frame) {
  let uris = [frame.uri];

  if (frame.metadata && frame.metadata.documentFingerprint) {
    uris = frame.metadata.link.map(link => link.href);
  }

  if (frame.metadata && frame.metadata.link) {
    frame.metadata.link.forEach(link => {
      if (link.href.startsWith('doi:')) {
        uris.push(link.href);
      }
    });
  }

  return uris;
}

// "selector creator" that uses `shallowEqual` instead of `===` for memoization
const createShallowEqualSelector = createSelectorCreator(
  defaultMemoize,
  shallowEqual
);

/**
 * Memoized selector will return the same array (of URIs) reference unless the
 * values of the array change (are not shallow-equal).
 *
 * @type {(state: any) => string[]}
 */
const searchUris = createShallowEqualSelector(
  frames => {
    return frames.reduce(
      (uris, frame) => uris.concat(searchUrisForFrame(frame)),
      []
    );
  },
  uris => uris
);

export default createStoreModule(initialState, {
  namespace: 'frames',

  actions: {
    /**
     * Add a frame to the list of frames currently connected to the sidebar app.
     *
     * @param {Frame} frame
     */
    connectFrame(state, frame) {
      return [...state, frame];
    },

    /**
     * Remove a frame from the list of frames currently connected to the sidebar app.
     *
     * @param {Frame} frame
     */
    destroyFrame(state, frame) {
      return state.filter(f => f !== frame);
    },

    /**
     * Update the `isAnnotationFetchComplete` flag of the frame.
     *
     * @param {string} uri
     * @param {boolean} fetchComplete
     */
    updateFrameAnnotationFetchStatus(state, uri, fetchComplete) {
      const frames = state.map(frame => {
        const match = frame.uri && frame.uri === uri;
        if (match) {
          return Object.assign({}, frame, {
            isAnnotationFetchComplete: fetchComplete,
          });
        } else {
          return frame;
        }
      });
      return frames;
    },
  },

  selectors: {
    frames(state) {
      return state;
    },

    /**
     * Return the "main" frame that the sidebar is connected to.
     *
     * The sidebar may be connected to multiple frames from different URLs.
     * For some purposes, the main frame (typically the top-level one that contains
     * the sidebar) needs to be distinguished. This selector returns the main frame
     * for that purpose.
     *
     * This may be `null` during startup.
     *
     * @type {(state: Readonly<Frame[]>) => Frame|null}
     */
    mainFrame: createSelector(
      state => state,

      // Sub-frames will all have a "frame identifier" set. The main frame is the
      // one with a `null` id.
      frames => frames.find(f => !f.id) || null
    ),

    searchUris,
  },
});
