'use strict';

/**
 * Fetch all annotations in the same thread as `id`.
 *
 * @return Promise<Array<Annotation>>
 */
function fetchThread(apiClient, id) {
  var annot;
  return apiClient.annotation.get({id: id}).then(function (annot) {
    if (annot.references && annot.references.length) {
      // This is a reply, fetch the top-level annotation
      return apiClient.annotation.get({id: annot.references[0]});
    } else {
      return annot;
    }
  }).then(function (annot_) {
    annot = annot_;
    return apiClient.search({references: annot.id});
  }).then(function (searchResult) {
    return [annot].concat(searchResult.rows);
  });
}

// @ngInject
function AnnotationViewerContentController (
  $location, $routeParams, store, rootThread, streamer, apiClient,
  streamFilter, annotationMapper
) {
  var self = this;

  store.setAppIsSidebar(false);

  var id = $routeParams.id;

  this.search.update = function (query) {
    $location.path('/stream').search('q', query);
  };

  store.subscribe(function () {
    self.rootThread = rootThread.thread(store.getState());
  });

  this.setCollapsed = function (id, collapsed) {
    store.setCollapsed(id, collapsed);
  };

  this.ready = fetchThread(apiClient, id).then(function (annots) {
    annotationMapper.loadAnnotations(annots);

    var topLevelAnnot = annots.filter(function (annot) {
      return (annot.references || []).length === 0;
    })[0];

    if (!topLevelAnnot) {
      return;
    }

    streamFilter
      .setMatchPolicyIncludeAny()
      .addClause('/references', 'one_of', topLevelAnnot.id, true)
      .addClause('/id', 'equals', topLevelAnnot.id, true);
    streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    streamer.connect();

    annots.forEach(function (annot) {
      store.setCollapsed(annot.id, false);
    });

    if (topLevelAnnot.id !== id) {
      store.highlightAnnotations([id]);
    }
  });
}

module.exports = {
  controller: AnnotationViewerContentController,
  controllerAs: 'vm',
  bindings: {
    search: '<',
  },
  template: require('../templates/annotation-viewer-content.html'),
};
