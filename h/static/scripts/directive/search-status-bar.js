'use strict';

var uiConstants = require('../ui-constants');

// @ngInject
module.exports = function () {
  return {
    bindToController: true,
    controllerAs: 'vm',
    controller: function () {
      this.tabAnnotations = uiConstants.TAB_ANNOTATIONS;
      this.tabNotes = uiConstants.TAB_NOTES;
    },
    restrict: 'E',
    scope: {
      filterActive: '<',
      filterMatchCount: '<',
      onClearSelection: '&',
      searchQuery: '<',
      selectedTab: '<',
      selectionCount: '<',
      totalAnnotations: '<',
      totalNotes: '<',
    },
    template: require('../../../templates/client/search_status_bar.html'),
  };
};
