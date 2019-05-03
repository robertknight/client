'use strict';

const { createElement } = require('preact');
const { useMemo } = require('preact/hooks');
const propTypes = require('prop-types');

const isThirdPartyService = require('../util/is-third-party-service');
const { isThirdPartyUser } = require('../util/account-id');
const groupsByOrganization = require('../util/group-organizations');
const { withPropsFromStore } = require('../store/connect-store');
const { withServices } = require('../util/service-context');
const serviceConfig = require('../service-config');

const Menu = require('./menu');
const MenuItem = require('./menu-item');
const GroupListSection = require('./group-list-section');

/**
 * Return the custom icon for the top bar configured by the publisher in
 * the Hypothesis client configuration.
 */
function publisherProvidedIcon(settings) {
  const svc = serviceConfig(settings);
  return svc && svc.icon ? svc.icon : null;
}

/**
 * Menu allowing the user to select which group to show and also access
 * additional actions related to groups.
 */
function GroupList({
  currentGroups,
  featuredGroups,
  focusedGroup,
  myGroups,
  profile,
  serviceUrl,
  settings,
}) {
  const myGroupsSorted = useMemo(() => groupsByOrganization(myGroups), [
    myGroups,
  ]);

  const featuredGroupsSorted = useMemo(
    () => groupsByOrganization(featuredGroups),
    [featuredGroups]
  );

  const currentGroupsSorted = useMemo(
    () => groupsByOrganization(currentGroups),
    [currentGroups]
  );

  const { authDomain } = settings;
  const userid = profile.userid;
  const canCreateNewGroup = userid && !isThirdPartyUser(userid, authDomain);
  const newGroupLink = serviceUrl('groups.new');

  let label;
  if (focusedGroup) {
    const icon = focusedGroup.organization.logo;
    label = (
      <span>
        <img
          className="group-list-label__icon group-list-label__icon--organization"
          src={icon || publisherProvidedIcon(settings)}
        />
        <span className="group-list-label__label">{focusedGroup.name}</span>
      </span>
    );
  } else {
    label = <span>…</span>;
  }

  // If there is only one group and no actions available for that group,
  // just show the group name as a label.
  const actionsAvailable = !isThirdPartyService(settings);
  if (
    !actionsAvailable &&
    currentGroups.length + featuredGroups.length + myGroups.length < 2
  ) {
    return label;
  }

  return (
    <Menu align="left" label={label} title="Select group">
      {currentGroupsSorted.length > 0 && (
        <GroupListSection
          heading="Currently Viewing"
          groups={currentGroupsSorted}
        />
      )}
      {featuredGroupsSorted.length > 0 && (
        <GroupListSection
          heading="Featured Groups"
          groups={featuredGroupsSorted}
        />
      )}
      {myGroupsSorted.length > 0 && (
        <GroupListSection heading="My Groups" groups={myGroupsSorted} />
      )}

      {canCreateNewGroup && (
        <MenuItem
          icon="add-group"
          href={newGroupLink}
          label="New private group"
          style="shaded"
        />
      )}
    </Menu>
  );
}

GroupList.propTypes = {
  currentGroups: propTypes.arrayOf(propTypes.object),
  myGroups: propTypes.arrayOf(propTypes.object),
  featuredGroups: propTypes.arrayOf(propTypes.object),
  focusedGroup: propTypes.object,
  profile: propTypes.object,

  serviceUrl: propTypes.func,
  settings: propTypes.object,
};

GroupList.injectedProps = ['serviceUrl', 'settings'];

module.exports = withPropsFromStore(withServices(GroupList), {
  currentGroups: store => store.getCurrentlyViewingGroups(),
  featuredGroups: store => store.getFeaturedGroups(),
  focusedGroup: store => store.focusedGroup(),
  myGroups: store => store.getMyGroups(),
  profile: store => store.profile(),
});
