'use strict';

var tabs = require('../tabs');
var session = require('../reducers/session');
var uiConstants = require('../ui-constants');

function mapStateToController(state, dispatch) {
  var counts = tabs.counts(state.annotations, true /* separateOrphans */);

  return {
    orphansTabFlagEnabled: session.isFeatureEnabled(state, 'orphans_tab'),
    isWaitingToAnchorAnnotations: counts.anchoring > 0,
    selectedTab: state.selectedTab,
    totalAnnotations: counts.annotations,
    totalNotes: counts.notes,
    totalOrphans: counts.orphans,

    selectTab: function (type) {
      dispatch({type: 'CLEAR_SELECTION'});
      dispatch({type: 'SELECT_TAB', tab: type});
    },
  };
}

//@ngInject
function SelectionTabsController($element, connectStore) {
  connectStore(this, mapStateToController);

  this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
  this.TAB_NOTES = uiConstants.TAB_NOTES;
  this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;

  this.showAnnotationsUnavailableMessage = function () {
    return this.selectedTab === this.TAB_ANNOTATIONS &&
      this.totalAnnotations === 0 &&
      !this.isWaitingToAnchorAnnotations;
  };

  this.showNotesUnavailableMessage = function () {
    return this.selectedTab === this.TAB_NOTES &&
      this.totalNotes === 0;
  };
}

module.exports = {
  controller: SelectionTabsController,
  controllerAs: 'vm',
  bindings: {
    isLoading: '<',
  },
  template: require('../templates/selection_tabs.html'),
};
