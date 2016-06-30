'use strict';

var uiConstants = require('../ui-constants');

module.exports = function () {
  return {
    bindToController: true,
    controllerAs: 'vm',
    //@ngInject
    controller: function (annotationUI) {
      this.tabAnnotations = uiConstants.TAB_ANNOTATIONS;
      this.tabNotes = uiConstants.TAB_NOTES;

      this.selectTab = function (type) {
        annotationUI.clearSelectedAnnotations();
        annotationUI.selectTab(type);
      };
    },
    restrict: 'E',
    scope: {
      isLoading: '<',
      selectedTab: '<',
      totalAnnotations: '<',
      totalNotes: '<',
    },
    template: require('../../../templates/client/selection_tabs.html'),
  };
};
