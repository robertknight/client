'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const GroupListItem = require('./group-list-item');
const MenuSection = require('./menu-section');

/**
 * A labeled section of the groups list.
 */
function GroupListSection({ analytics, groups, heading, sectionGroups, store }) {
  return (
    <MenuSection heading={heading}>
      {sectionGroups.map(group => (
        <GroupListItem key={group.id} group={group} analytics={analytics} groups={groups} store={store} />
      ))}
    </MenuSection>
  );
}

GroupListSection.propTypes = {
  /* The list of groups to be displayed in the group list section. */
  sectionGroups: propTypes.arrayOf(propTypes.object),
  /* The string name of the group list section. */
  heading: propTypes.string,

  // TODO - These are only used by child components. It shouldn't be necessary
  // to pass them down manually.
  analytics: propTypes.object.isRequired,
  groups: propTypes.object.isRequired,
  store: propTypes.object.isRequired,
};

GroupListSection.injectedProps = ['analytics', 'groups', 'store'];

module.exports = GroupListSection;
