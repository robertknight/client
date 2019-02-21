'use strict';

const classnames = require('classnames');
const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');

const { TAB_ANNOTATIONS, TAB_NOTES, TAB_ORPHANS } = require('../ui-constants');
const { BEFORE_ANNOTATION_CREATED } = require('../events');
const { memo } = require('../util/react');

function Tab({ label, count, isSelected, onClick }) {
  return (
    <a
      className={classnames({
        'selection-tabs__type': true,
        'is-selected': isSelected,
      })}
      onClick={onClick}
    >
      {label}
      {count !== null ? (
        <span className="selection-tabs__count"> {count}</span>
      ) : null}
    </a>
  );
}
Tab.propTypes = {
  label: propTypes.string,
  count: propTypes.number,
  isSelected: propTypes.bool,
  onClick: propTypes.func,
};

function TabBar({ useCleanTheme, children }) {
  return (
    <div
      className={classnames({
        'selection-tabs': true,
        'selection-tabs--theme-clean': useCleanTheme,
      })}
    >
      {children}
    </div>
  );
}
TabBar.propTypes = {
  useCleanTheme: propTypes.bool,
  children: propTypes.arrayOf(propTypes.element),
};

// TODO - Figure how to connect this to injected services without having to
// pass them all down.
function NewNoteButton({ store, $rootScope }) {
  const createNewNote = () => {
    const topLevelFrame = store.frames().find(f => !f.id);
    const annot = {
      target: [],
      uri: topLevelFrame.uri,
    };

    $rootScope.$broadcast(BEFORE_ANNOTATION_CREATED, annot);
  };
  return (
    <button className="new-note__create" onClick={createNewNote}>
      + New note
    </button>
  );
}
NewNoteButton.propTypes = {
  store: propTypes.object,
  $rootScope: propTypes.object,
};

function EmptyTabMessage({ tab }) {
  let emptyMsg;
  let tutorialMsg;

  if (tab === TAB_ANNOTATIONS) {
    emptyMsg = 'There are no annotations in this group';
    tutorialMsg = (
      <span>
        Create one by clicking the <i className="help-icon h-icon-annotate" />{' '}
        button.
      </span>
    );
  } else if (tab === TAB_NOTES) {
    emptyMsg = 'There are no page notes in this group.';
    tutorialMsg = (
      <span>
        Create one by selecting some text and clicking the{' '}
        <i className="help-icon h-icon-note" /> button.
      </span>
    );
  }

  return (
    <div className="selection-tabs__empty-message">
      <div className="annotation-unavailable-message">
        <p className="annotation-unavailable-message__label">
          {emptyMsg}
          <br />
          <div className="annotation-unavailable-message__tutorial">
            {tutorialMsg}
          </div>
        </p>
      </div>
    </div>
  );
}
EmptyTabMessage.propTypes = {
  /** The selected tab. */
  tab: propTypes.string,
};

/**
 * Tab bar above the annotation list for selecting which types of annotations
 * are shown.
 *
 * Also includes a message which is displayed underneath the tab bar if there
 * are no annotations in the selected tab.
 */
function SelectionTabs(props) {
  const {
    $rootScope,
    isLoading,
    isWaitingToAnchorAnnotations,
    selectedTab,
    settings,
    store,
  } = props;

  let { totalAnnotations, totalNotes, totalOrphans } = props;
  if (isWaitingToAnchorAnnotations) {
    totalAnnotations = null;
    totalNotes = null;
    totalOrphans = null;
  }

  const { isThemeClean } = settings;
  const counts = {
    [TAB_ANNOTATIONS]: totalAnnotations,
    [TAB_NOTES]: totalNotes,
    [TAB_ORPHANS]: totalOrphans,
  };
  const showEmptyTabMsg = !isLoading && counts[selectedTab] === 0;
  const showNewNoteButton =
    settings.enableExperimentalNewNoteButton && selectedTab === TAB_NOTES;

  const selectTab = type => {
    store.clearSelectedAnnotations();
    store.selectTab(type);
  };

  return (
    <Fragment>
      <TabBar useCleanTheme={isThemeClean}>
        <Tab
          label="Annotations"
          count={totalAnnotations}
          isSelected={selectedTab === TAB_ANNOTATIONS}
          onClick={() => selectTab(TAB_ANNOTATIONS)}
        />
        <Tab
          label="Notes"
          count={totalNotes}
          isSelected={selectedTab === TAB_NOTES}
          onClick={() => selectTab(TAB_NOTES)}
        />
        {totalOrphans > 0 ? (
          <Tab
            label="Orphans"
            count={totalOrphans}
            isSelected={selectedTab === TAB_ORPHANS}
            onClick={() => selectTab(TAB_ORPHANS)}
          />
        ) : null}
      </TabBar>
      {showNewNoteButton ? (
        <NewNoteButton $rootScope={$rootScope} store={store} />
      ) : null}
      {showEmptyTabMsg ? <EmptyTabMessage tab={selectedTab} /> : null}
    </Fragment>
  );
}
SelectionTabs.propTypes = {
  isLoading: propTypes.bool,
  isWaitingToAnchorAnnotations: propTypes.bool,
  selectedTab: propTypes.string,
  totalAnnotations: propTypes.number,
  totalNotes: propTypes.number,
  totalOrphans: propTypes.number,

  $rootScope: propTypes.object,
  settings: propTypes.object,
  store: propTypes.object,
};

SelectionTabs.injectedProps = ['$rootScope', 'settings', 'store'];

module.exports = memo(SelectionTabs);
