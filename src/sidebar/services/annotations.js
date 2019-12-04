'use strict';

const SearchClient = require('../search-client');

// @ngInject
function annotations(annotationMapper, api, store, streamer, streamFilter) {
  let searchClient = null;

  /**
   * Load annotations for all URIs and groupId.
   *
   * @param {string[]} uris
   * @param {string} groupId
   */
  function load(uris, groupId) {
    annotationMapper.unloadAnnotations(store.savedAnnotations());

    // Cancel previously running search client.
    if (searchClient) {
      searchClient.cancel();
    }

    if (uris.length > 0) {
      searchAndLoad(uris, groupId);

      streamFilter.resetFilter().addClause('/uri', 'one_of', uris);
      streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    }
  }

  function searchAndLoad(uris, groupId) {
    searchClient = new SearchClient(api.search, {
      incremental: true,
    });
    searchClient.on('results', results => {
      if (results.length) {
        annotationMapper.loadAnnotations(results);
      }
    });
    searchClient.on('error', error => {
      console.error(error);
    });
    searchClient.on('end', () => {
      // Remove client as it's no longer active.
      searchClient = null;

      store.frames().forEach(function(frame) {
        if (0 <= uris.indexOf(frame.uri)) {
          store.updateFrameAnnotationFetchStatus(frame.uri, true);
        }
      });
      store.annotationFetchFinished();
    });
    store.annotationFetchStarted();
    searchClient.get({ uri: uris, group: groupId });
  }

  /**
   * Setup store subscriber that fetches annotations when the app initially
   * loads and when the user switches groups or the URIs of documents connected
   * to the sidebar changes.
   */
  function init() {
    // Re-fetch annotations when focused group, or connected frames change.
    //
    // The visible set of annotations can also change when the logged-in user changes
    // due to the private annotations for the current group changing.
    //
    // This logic assumes that the focused group will always change to `null`
    // temporarily during a log-in or log-out operation.
    store.watch(
      () => [
        store.focusedGroupId(),
        ...store.searchUris(),
      ],
      ([currentGroupId, searchUris], [prevGroupId] = [null]) => {
        if (!currentGroupId) {
          // When switching accounts, groups are cleared and so the focused group id
          // will be null for a brief period of time.
          store.clearSelectedAnnotations();
          return;
        }

        if (!prevGroupId || currentGroupId !== prevGroupId) {
          store.clearSelectedAnnotations();
        }
        load(searchUris, currentGroupId);
      }
    );
  }

  return {
    init,
    load,
  };
}

module.exports = annotations;
