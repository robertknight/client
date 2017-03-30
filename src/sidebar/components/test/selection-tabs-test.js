'use strict';

var angular = require('angular');

var fakeConnectStore = require('../../test/fake-connect-store');

var util = require('../../directive/test/util');

describe('selectionTabs', function () {
  var connectStore;

  before(function () {
    var component = require('../selection-tabs');

    // Simplify testing by making tabs activate on click rather than touch
    component = Object.assign({}, component, {
      template: component.template.replace('h-on-touch', 'ng-click'),
    });

    angular.module('app', [])
      .component('selectionTabs', component);
  });

  beforeEach(function () {
    connectStore = fakeConnectStore({
      annotations: [],
      selectedTab: 'annotation',
      session: {
        features: {
          'orphans_tab': true,
        },
      },
    });

    angular.mock.module('app', {
      connectStore: connectStore,
    });
  });

  var ann = {
    $orphan: false,
    target: [{
      selector: [{}],
    }],
  };

  var pageNote = {
    $orphan: false,
    target: [{}],
  };

  context('displays selection tabs, counts and a selection', function () {
    it('should display the tabs and counts of annotations and notes', function () {
      var elem = util.createDirective(document, 'selectionTabs');

      connectStore.updateState({
        annotations: [ann, ann, pageNote],
      });
      elem.scope.$digest();

      var tabs = elem[0].querySelectorAll('a');

      assert.include(tabs[0].textContent, 'Annotations');
      assert.include(tabs[1].textContent, 'Notes');
      assert.include(tabs[0].textContent, '2');
      assert.include(tabs[1].textContent, '1');
    });

    it('should display annotations tab as selected', function () {
      var elem = util.createDirective(document, 'selectionTabs');
      var tabs = elem[0].querySelectorAll('a');
      assert.isTrue(tabs[0].classList.contains('is-selected'));
    });

    it('should display notes tab as selected', function () {
      var elem = util.createDirective(document, 'selectionTabs');

      connectStore.updateState({ selectedTab: 'note' });
      elem.scope.$digest();

      var tabs = elem[0].querySelectorAll('a');
      assert.isTrue(tabs[1].classList.contains('is-selected'));
    });

    it('should clear the selection when a tab is clicked', function () {
      var elem = util.createDirective(document, 'selectionTabs');

      elem[0].querySelector('a').click();

      assert.calledWith(connectStore.dispatch, { type: 'CLEAR_SELECTION' });
    });

    it('should select a tab when clicked', function () {
      var elem = util.createDirective(document, 'selectionTabs');

      elem[0].querySelector('a').click();

      assert.calledWith(connectStore.dispatch, { type: 'SELECT_TAB', tab: 'annotation' });
    });
  });
});
