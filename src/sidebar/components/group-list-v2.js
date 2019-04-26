'use strict';

const { Fragment, createElement } = require('preact');
const { useMemo } = require('preact/hooks');
const propTypes = require('prop-types');

const { isThirdPartyUser } = require('../util/account-id');
const groupsByOrganization = require('../util/group-organizations');
const { withPropsFromStore } = require('./util/connect-store');

const MenuItem = require('./menu-item');
const GroupListSection = require('./group-list-section');

/**
 * The list of groups in the dropdown menu at the top of the client.
 */
function GroupListV2({
  analytics,
  currentGroups,
  featuredGroups,
  groups,
  myGroups,
  serviceUrl,
  settings,
  store,
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
  const userid = store.profile().userid;
  const canCreateNewGroup = userid && !isThirdPartyUser(userid, authDomain);
  const newGroupLink = serviceUrl('groups.new');

  return (
    <Fragment>
      {currentGroupsSorted.length > 0 && (
        <GroupListSection
          analytics={analytics}
          groups={groups}
          store={store}
          heading="Currently Viewing"
          sectionGroups={currentGroupsSorted}
        />
      )}
      {featuredGroupsSorted.length > 0 && (
        <GroupListSection
          analytics={analytics}
          groups={groups}
          store={store}
          heading="Featured Groups"
          sectionGroups={featuredGroupsSorted}
        />
      )}
      {myGroupsSorted.length > 0 && (
        <GroupListSection
          analytics={analytics}
          groups={groups}
          store={store}
          heading="My Groups"
          sectionGroups={myGroupsSorted}
        />
      )}

      {canCreateNewGroup && (
        <MenuItem
          icon="add-group"
          href={newGroupLink}
          label="New private group"
          style="shaded"
        />
      )}

      {
        <span /> /* Work around https://github.com/developit/preact/issues/1567 */
      }
    </Fragment>
  );
}

GroupListV2.propTypes = {
  currentGroups: propTypes.arrayOf(propTypes.object),
  myGroups: propTypes.arrayOf(propTypes.object),
  featuredGroups: propTypes.arrayOf(propTypes.object),

  analytics: propTypes.object,
  groups: propTypes.object,
  serviceUrl: propTypes.func,
  settings: propTypes.object,
  store: propTypes.object,
};

GroupListV2.injectedProps = [
  'analytics',
  'groups',
  'serviceUrl',
  'settings',
  'store',
];

module.exports = withPropsFromStore(GroupListV2, {
  currentGroups: store => store.getCurrentlyViewingGroups(),
  featuredGroups: store => store.getFeaturedGroups(),
  myGroups: store => store.getMyGroups(),
});
