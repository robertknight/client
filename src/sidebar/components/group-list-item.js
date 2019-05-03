'use strict';

// FIXME - This doesn't get transpiled.
// const copyTextToClipboard = require('copy-text-to-clipboard');
const propTypes = require('prop-types');
const { Fragment, createElement } = require('preact');
const { useState } = require('preact/hooks');
const { withPropsFromStore } = require('../store/connect-store');

const { orgName } = require('../util/group-list-item-common');
const { withServices } = require('../util/service-context');

const MenuItem = require('./menu-item');

/**
 * An item in the groups selection menu.
 *
 * The item has a primary action which selects the group, along with a set of
 * secondary actions accessible via a toggle menu.
 */
function GroupListItem({ analytics, focusedGroupId, group, groups, store }) {
  const canLeaveGroup = group.type === 'private';
  const activityUrl = group.links.html;
  const hasActionMenu = activityUrl || canLeaveGroup;
  const isSelectable = !group.scopes.enforced || group.isScopedToUri;

  const [isExpanded, setExpanded] = useState(hasActionMenu ? false : undefined);
  const isSelected = group.id === focusedGroupId;

  const focusGroup = () => {
    analytics.track(analytics.events.GROUP_SWITCH);
    store.focusGroup(group.id);
  };

  const copyLink = () => {
    copyTextToClipboard(group.links.html);
  };

  const leaveGroup = () => {
    const message = `Are you sure you want to leave the group "${group.name}"?`;
    if (window.confirm(message)) {
      analytics.track(analytics.events.GROUP_LEAVE);
      groups.leave(group.id);
    }
  };

  const toggleSubmenu = event => {
    event.stopPropagation();

    // Prevents group items opening a new window when clicked.
    // TODO - Fix this more cleanly in `MenuItem`.
    event.preventDefault();

    setExpanded(!isExpanded);
  };

  // Close the submenu when any clicks happen which close the top-level menu.
  const collapseSubmenu = () => setExpanded(false);

  return (
    <Fragment>
      <MenuItem
        icon={group.logo || null}
        iconAlt={orgName(group)}
        isDisabled={!isSelectable}
        isExpanded={isExpanded}
        isSelected={isSelected}
        isSubmenuVisible={isExpanded}
        label={group.name}
        onClick={isSelectable ? focusGroup : toggleSubmenu}
        onToggleSubmenu={toggleSubmenu}
      />
      {isExpanded && (
        <Fragment>
          <ul onClick={collapseSubmenu}>
            {activityUrl && (
              <li>
                <MenuItem
                  href={activityUrl}
                  icon="share"
                  label="View group activity"
                  style="submenu"
                />
              </li>
            )}
            {activityUrl && (
              <li>
                <MenuItem
                  icon="copy"
                  label="Copy invite link"
                  onClick={copyLink}
                  style="submenu"
                />
              </li>
            )}
            {canLeaveGroup && (
              <li>
                <MenuItem
                  icon="leave"
                  label="Leave group"
                  onClick={leaveGroup}
                  style="submenu"
                />
              </li>
            )}
          </ul>
          {!isSelectable && (
            <p className="group-list-item__footer">
              This group is restricted to specific URLs.
            </p>
          )}
        </Fragment>
      )}
    </Fragment>
  );
}

GroupListItem.propTypes = {
  group: propTypes.object.isRequired,
  focusedGroupId: propTypes.string,

  analytics: propTypes.object.isRequired,
  groups: propTypes.object.isRequired,
  store: propTypes.object.isRequired,
};

GroupListItem.injectedProps = ['analytics', 'groups', 'store'];

module.exports = withPropsFromStore(withServices(GroupListItem), {
  focusedGroupId: store => store.focusedGroupId(),
});
