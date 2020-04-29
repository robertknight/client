/**
 * A service for fetching annotations, filtered by document URIs and group.
 */
import SearchClient from '../search-client';

// @ngInject
export default function loadAnnotationsService(
  api,
  store,
  streamer,
  streamFilter,
  tasks
) {
  let searchClient = null;

  /**
   * Load annotations for all URIs and groupId.
   *
   * @param {string[]} uris
   * @param {string} groupId
   */
  function load(uris, groupId) {
    const doLoad = async () => {
      store.removeAnnotations(store.savedAnnotations());

      // Cancel previously running search client.
      if (searchClient) {
        searchClient.cancel();
      }

      if (uris.length > 0) {
        await searchAndLoad(uris, groupId);

        streamFilter.resetFilter().addClause('/uri', 'one_of', uris);
        streamer.setConfig('filter', { filter: streamFilter.getFilter() });
      }
    };

    return tasks.try(doLoad).result;
  }

  function searchAndLoad(uris, groupId) {
    return new Promise((resolve, reject) => {
      searchClient = new SearchClient(api.search, {
        incremental: true,
      });
      searchClient.on('results', results => {
        if (results.length) {
          store.addAnnotations(results);
        }
      });
      searchClient.on('error', error => {
        reject(error);
      });
      searchClient.on('end', () => {
        // Remove client as it's no longer active.
        searchClient = null;

        store.frames().forEach(function (frame) {
          if (0 <= uris.indexOf(frame.uri)) {
            store.updateFrameAnnotationFetchStatus(frame.uri, true);
          }
        });
        store.annotationFetchFinished();
        resolve();
      });
      store.annotationFetchStarted();
      searchClient.get({ uri: uris, group: groupId });
    });
  }

  return {
    load,
  };
}
