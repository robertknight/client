'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useState } = require('preact/hooks');

const { orgName } = require('../util/group-list-item-common');

const GroupActionsPane = require('./group-actions-pane');
const Icon = require('./icon');

function GroupListItem({ analytics, group, store }) {
  const [isActionsPaneVisible, setActionsPaneVisible] = useState(false);

  const focusGroup = () => {
    analytics.track(analytics.events.GROUP_SWITCH);
    store.focusGroup(group.id);
  };

  const showActions = event => {
    event.stopPropagation();
    setActionsPaneVisible(true);
  };
  const hideActions = () => setActionsPaneVisible(false);

  const isSelected = group.id === store.focusedGroupId();
  const groupOrgName = orgName(group);

  return (
    <div
      className={classnames({
        'group-list-item__item': true,
        'is-selected': isSelected,
      })}
      onClick={focusGroup}
      tabIndex="0"
    >
      {/* the group icon */}
      <div className="group-list-item__icon-container">
        {group.logo && (
          <img
            className="group-list-item__icon group-list-item__icon--organization"
            alt={groupOrgName}
            src={group.logo}
          />
        )}
      </div>
      {/* the group name */}
      <div className="group-list-item__details">
        <a
          className="group-list-item__name-link"
          href=""
          title={
            group.type === 'private'
              ? `Show and create annotations in ${group.name}`
              : 'Show public annotations'
          }
        >
          {group.name}
        </a>
      </div>
      <button
        aria-label="Actions"
        className="group-list-item__menu"
        onClick={showActions}
      >
        <Icon className="group-list-item__menu-icon" type="more-options" />
      </button>
      {isActionsPaneVisible && (
        <GroupActionsPane onClose={hideActions} group={group} />
      )}
    </div>
  );
}

GroupListItem.propTypes = {
  group: propTypes.object.isRequired,

  analytics: propTypes.object.isRequired,
  store: propTypes.object.isRequired,
};

GroupListItem.injectedProps = ['analytics', 'store'];

module.exports = GroupListItem;
