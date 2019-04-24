'use strict';

const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');

const GroupListItem = require('./group-list-item');
const GroupListItemOutOfScope = require('./group-list-item-out-of-scope');

/**
 * A labeled section of the groups list.
 */
function GroupListSection({ analytics, groups, heading, store }) {
  const isSelectable = groupId => {
    const group = groups.find(g => g.id === groupId);
    return !group.scopes.enforced || group.isScopedToUri;
  };

  return (
    <Fragment>
      <h2 className="group-list-section__heading">{heading}</h2>
      <ul className="group-list-section__content">
        {groups.map(group => (
          <li
            key={group.id}
          >
            {isSelectable(group.id) ? (
              <GroupListItem
                className="group-list-item"
                group={group}
                analytics={analytics}
                store={store}
              />
            ) : (
              <GroupListItemOutOfScope
                className="group-list-item-out-of-scope"
                group={group}
                analytics={analytics}
              />
            )}
          </li>
        ))}
      </ul>
    </Fragment>
  );
}

GroupListSection.propTypes = {
  /* The list of groups to be displayed in the group list section. */
  groups: propTypes.arrayOf(propTypes.object),
  /* The string name of the group list section. */
  heading: propTypes.string,

  // TODO - These are only used by child components. It shouldn't be necessary
  // to pass them down manually.
  analytics: propTypes.object.isRequired,
  store: propTypes.object.isRequired,
};

GroupListSection.injectedProps = ['analytics', 'store'];

module.exports = GroupListSection;
