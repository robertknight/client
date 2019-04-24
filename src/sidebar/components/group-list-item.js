'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { Fragment, createElement } = require('preact');
const { useState } = require('preact/hooks');

const { orgName } = require('../util/group-list-item-common');
const GroupListItemBase = require('./group-list-item-base');

function GroupListItem({ analytics, group, store }) {
  const [isExpanded, setExpanded] = useState(false);
  const focusGroup = () => {
    setExpanded(false);
    analytics.track(analytics.events.GROUP_SWITCH);
    store.focusGroup(group.id);
  };

  const isSelected = group.id === store.focusedGroupId();
  const groupOrgName = orgName(group);

  const copyLink = () => {};
  const leaveGroup = () => {};

  const toggle = event => {
    event.stopPropagation();

    // Prevents group items opening a new window when clicked.
    // TODO - Fix this more cleanly in `GroupListItemBase`.
    event.preventDefault();

    setExpanded(!isExpanded);
  };

  return (
    <Fragment>
      <GroupListItemBase
        className={classnames({
          'is-selected': isSelected,
          'is-expanded': isExpanded,
        })}
        imgIcon={group.logo}
        imgAlt={groupOrgName}
        isExpanded={isExpanded}
        label={group.name}
        onClick={toggle}
        title={
          group.type === 'private'
            ? `Show and create annotations in ${group.name}`
            : 'Show public annotations'
        }
      />
      {isExpanded && (
        <ul>
          <li>
            <GroupListItemBase label="Select group" onClick={focusGroup} />
          </li>
          <li>
            <GroupListItemBase label="View group activity" href={group.url} />
          </li>
          <li>
            <GroupListItemBase label="Copy invite link" onClick={copyLink} />
          </li>
          <li>
            <GroupListItemBase label="Leave group" onClick={leaveGroup} />
          </li>
        </ul>
      )}
      {<span/> /* work around https://github.com/developit/preact/issues/1567 */}
    </Fragment>
  );
}

GroupListItem.propTypes = {
  group: propTypes.object.isRequired,

  analytics: propTypes.object.isRequired,
  store: propTypes.object.isRequired,
};

GroupListItem.injectedProps = ['analytics', 'store'];

module.exports = GroupListItem;
