'use strict';

var session = require('./session');
var util = require('./util');

var { isFeatureEnabled } = session.selectors;

function init() {
  // The list of frames connected to the sidebar app
  return [];
}

var update = {
  CONNECT_FRAME: function (state, action) {
    return state.concat(action.frame);
  },

  DESTROY_FRAME: function (state, action) {
    return state.filter(f => f !== action.frame);
  },

  UPDATE_FRAME_ANNOTATION_FETCH_STATUS: function (state, action) {
    var frames = state.map(function (frame) {
      var match = (frame.uri && frame.uri === action.uri);
      if (match) {
        return Object.assign({}, frame, {
          isAnnotationFetchComplete: action.isAnnotationFetchComplete,
        });
      } else {
        return frame;
      }
    });
    return frames;
  },
};

var actions = util.actionTypes(update);

/**
 * Add a frame to the list of frames currently connected to the sidebar app.
 */
function connectFrame(frame) {
  return {type: actions.CONNECT_FRAME, frame: frame};
}

/**
 * Remove a frame from the list of frames currently connected to the sidebar app.
 */
function destroyFrame(frame) {
  return {type: actions.DESTROY_FRAME, frame: frame};
}

/**
 * Update the `isAnnotationFetchComplete` flag of the frame.
 */
function updateFrameAnnotationFetchStatus(uri, status) {
  return {
    type: actions.UPDATE_FRAME_ANNOTATION_FETCH_STATUS,
    isAnnotationFetchComplete: status,
    uri: uri,
  };
}

/**
 * Return the list of frames currently connected to the sidebar app.
 */
function frames(ctx) {
  return ctx.state;
}

function searchUrisForFrame(frame, includeDoi) {
  var uris = [frame.uri];

  if (frame.metadata && frame.metadata.documentFingerprint) {
    uris = frame.metadata.link.map(function (link) {
      return link.href;
    });
  }

  if (includeDoi) {
    if (frame.metadata && frame.metadata.link) {
      frame.metadata.link.forEach(function (link) {
        if (link.href.startsWith('doi:')) {
          uris.push(link.href);
        }
      });
    }
  }

  return uris;
}

/**
 * Return the set of URIs that should be used to search for annotations on the
 * current page.
 */
function searchUris(ctx) {
  var includeDoi = isFeatureEnabled(ctx.rootState, 'search_for_doi');
  return ctx.state.reduce(function (uris, frame) {
    return uris.concat(searchUrisForFrame(frame, includeDoi));
  }, []);
}

module.exports = {
  init,
  update,

  actions: {
    connectFrame,
    destroyFrame,
    updateFrameAnnotationFetchStatus,
  },

  selectors: {
    frames,
    searchUris,
  },

  isModule: true,
};
