'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

const { orgName } = require('../util/group-list-item-common');
const GroupListItemBase = require('./group-list-item-base');

function GroupListItem({ analytics, group, store }) {
  const focusGroup = () => {
    analytics.track(analytics.events.GROUP_SWITCH);
    store.focusGroup(group.id);
  };

  const isSelected = group.id === store.focusedGroupId();
  const groupOrgName = orgName(group);

  return (
    <GroupListItemBase
      className={isSelected ? 'is-selected' : ''}
      imgIcon={group.logo}
      imgAlt={groupOrgName}
      title={
        group.type === 'private'
          ? `Show and create annotations in ${group.name}`
          : 'Show public annotations'
      }
      onClick={focusGroup}
      label={group.name}
    />
  );
}

GroupListItem.propTypes = {
  group: propTypes.object.isRequired,

  analytics: propTypes.object.isRequired,
  store: propTypes.object.isRequired,
};

GroupListItem.injectedProps = ['analytics', 'store'];

module.exports = GroupListItem;
