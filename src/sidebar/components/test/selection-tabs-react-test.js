'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const {
  TAB_ANNOTATIONS,
  TAB_NOTES,
  TAB_ORPHANS,
} = require('../../ui-constants');
const SelectionTabs = require('../selection-tabs-react');

const tabTypes = [TAB_ANNOTATIONS, TAB_NOTES, TAB_ORPHANS];

describe('SelectionTabs', () => {
  let fakeStore;
  let fakeSettings;

  function render({
    isLoading = false,
    isWaitingToAnchorAnnotations = false,
    selectedTab = TAB_ANNOTATIONS,
    totalAnnotations = 0,
    totalNotes = 0,
    totalOrphans = 0,
  } = {}) {
    return shallow(
      <SelectionTabs
        isLoading={isLoading}
        isWaitingToAnchorAnnotations={isWaitingToAnchorAnnotations}
        selectedTab={selectedTab}
        totalAnnotations={totalAnnotations}
        totalNotes={totalNotes}
        totalOrphans={totalOrphans}
        store={fakeStore}
        settings={fakeSettings}
      />
    ).dive();
  }

  beforeEach(() => {
    fakeStore = {
      clearSelectedAnnotations: sinon.stub(),
      selectTab: sinon.stub(),
    };
    fakeSettings = {
      isThemeClean: false,
    };
  });

  it('renders Annotations and Notes tabs', () => {
    const tabs = render().find('Tab');
    assert.equal(tabs.length, 2);
    assert.equal(tabs.at(0).props().label, 'Annotations');
    assert.equal(tabs.at(1).props().label, 'Notes');
  });

  it('renders an Orphans tab if there are orphans', () => {
    const tabs = render({ totalOrphans: 1 }).find('Tab');
    assert.equal(tabs.length, 3);
    assert.equal(tabs.at(2).props().label, 'Orphans');
  });

  it('shows annotation counts on the tabs', () => {
    const tabs = render({
      totalAnnotations: 1,
      totalNotes: 2,
      totalOrphans: 3,
    }).find('Tab');
    assert.equal(tabs.at(0).props().count, 1);
    assert.equal(tabs.at(1).props().count, 2);
    assert.equal(tabs.at(2).props().count, 3);
  });

  it('does not show annotation counts on tabs if the app is waiting for annotations to anchor', () => {
    const tabs = render({
      totalAnnotations: 1,
      totalNotes: 2,
      totalOrphans: 3,
      isWaitingToAnchorAnnotations: true,
    }).find('Tab');
    assert.equal(tabs.length, 2);
    assert.equal(tabs.at(0).props().count, null);
    assert.equal(tabs.at(1).props().count, null);
  });

  tabTypes.forEach(selectedTab => {
    it('marks the current tab as selected', () => {
      const tabs = render({ selectedTab, totalOrphans: 1 }).find('Tab');
      for (let i = 0; i < 3; i++) {
        assert.equal(
          tabs.at(i).props().isSelected,
          tabTypes[i] === selectedTab
        );
      }
    });
  });

  it('changes the selected tab when clicked', () => {
    tabTypes.forEach(tab => {
      const tabs = render({ selectedTab: tab, totalOrphans: 1 }).find('Tab');
      for (let i = 0; i < 3; i++) {
        fakeStore.clearSelectedAnnotations.reset();
        fakeStore.selectTab.reset();

        tabs
          .at(i)
          .props()
          .onClick();

        assert.called(fakeStore.clearSelectedAnnotations);
        assert.calledWith(fakeStore.selectTab, tabTypes[i]);
      }
    });
  });

  [
    {
      totalAnnotations: 1,
      totalNotes: 0,
      selectedTab: TAB_ANNOTATIONS,
      isLoading: false,
    },
    {
      totalAnnotations: 0,
      totalNotes: 1,
      selectedTab: TAB_NOTES,
      isLoading: false,
    },
    {
      totalAnnotations: 0,
      totalNotes: 0,
      selectedTab: TAB_ANNOTATIONS,
      isLoading: true,
    },
    {
      totalAnnotations: 0,
      totalNotes: 0,
      selectedTab: TAB_NOTES,
      isLoading: true,
    },
  ].forEach(({ totalAnnotations, totalNotes, selectedTab, isLoading }) => {
    it('does not show a message beneath the tab bar if the tab is non-empty or annotations are loading', () => {
      const wrapper = render({
        totalAnnotations,
        totalNotes,
        selectedTab,
        isLoading,
      });
      assert.isFalse(wrapper.find('EmptyTabMessage').exists());
    });
  });

  [
    {
      totalAnnotations: 0,
      totalNotes: 1,
      selectedTab: TAB_ANNOTATIONS,
      expectedMessage: 'There are no annotations in this group',
      expectedIcon: 'h-icon-annotate',
    },
    {
      totalAnnotations: 1,
      totalNotes: 0,
      selectedTab: TAB_NOTES,
      expectedMessage: 'There are no page notes in this group',
      expectedIcon: 'h-icon-note',
    },
  ].forEach(
    ({
      totalAnnotations,
      totalNotes,
      selectedTab,
      expectedMessage,
      expectedIcon,
    }) => {
      it('does show a message beneath the tab bar if the tab is empty', () => {
        const wrapper = render({ totalAnnotations, totalNotes, selectedTab });
        const emptyTabMsg = wrapper.find('EmptyTabMessage');
        assert.isTrue(emptyTabMsg.exists());
        assert.include(emptyTabMsg.dive().text(), expectedMessage);
        assert.isTrue(
          emptyTabMsg
            .dive()
            .find(`.${expectedIcon}`)
            .exists()
        );
      });
    }
  );

  [
    {
      selectedTab: TAB_ANNOTATIONS,
      enableButton: true,
      shouldShowButton: false,
    },
    {
      selectedTab: TAB_NOTES,
      enableButton: true,
      shouldShowButton: true,
    },
    {
      selectedTab: TAB_NOTES,
      enableButton: false,
      shouldShowButton: false,
    },
  ].forEach(({ selectedTab, enableButton, shouldShowButton }) => {
    it('shows the new note button if the setting is enabled and the notes tab is selected', () => {
      fakeSettings.enableExperimentalNewNoteButton = enableButton;
      const wrapper = render({ selectedTab });
      const newNoteButton = wrapper.find('NewNoteButton');
      assert.equal(newNoteButton.exists(), shouldShowButton);
    });
  });
});
