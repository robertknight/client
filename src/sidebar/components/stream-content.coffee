angular = require('angular')

class StreamContentController
  this.$inject = [
    '$scope', '$location', '$rootScope',
    'annotationUI',
    'queryParser', 'rootThread', 'searchFilter', 'store',
    'streamer', 'streamFilter', 'annotationMapper'
  ]
  constructor: (
     $scope, $location, $rootScope,
     annotationUI,
     queryParser,   rootThread,   searchFilter,   store,
     streamer,   streamFilter,   annotationMapper
  ) ->
    annotationUI.setAppIsSidebar(false)
    $scope.isSidebar = false

    offset = 0

    fetch = (limit) ->
      options = {offset, limit}
      searchParams = searchFilter.toObject($location.search().q)
      query = angular.extend(options, searchParams)
      query._separate_replies = true
      store.search(query)
        .then(load)
        .catch((err) -> console.error err)

    load = ({rows, replies}) ->
      offset += rows.length
      annotationMapper.loadAnnotations(rows, replies)

    # Reload on query change (ignore hash change)
    lastQuery = $location.search().q
    $scope.$on '$locationChangeSuccess', ->
      if $location.search().q isnt lastQuery
        annotationUI.clearAnnotations()
        fetch(20)

    # Initialize the base filter
    streamFilter
      .resetFilter()
      .setMatchPolicyIncludeAll()

    # Apply query clauses
    terms = searchFilter.generateFacetedFilter $location.search().q
    queryParser.populateFilter streamFilter, terms
    streamer.setConfig('filter', {filter: streamFilter.getFilter()})
    streamer.connect()

    # Perform the initial search
    fetch(20)

    $scope.setCollapsed = (id, collapsed) ->
      annotationUI.setCollapsed(id, collapsed)

    $scope.forceVisible = (id) ->
      annotationUI.setForceVisible(id, true)

    annotationUI.subscribe( ->
      $scope.rootThread = rootThread.thread(annotationUI.getState())
    );

    # Sort the stream so that the newest annotations are at the top
    annotationUI.setSortKey('Newest')

    $scope.isStream = true
    $scope.loadMore = fetch

module.exports = {
  controller: StreamContentController,
  controllerAs: 'vm',
  template: require('../templates/stream_content.html'),
  }
