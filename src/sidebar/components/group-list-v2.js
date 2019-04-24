'use strict';

const { Fragment, createElement } = require('preact');
const { useMemo } = require('preact/hooks');
const propTypes = require('prop-types');

const { isThirdPartyUser } = require('../util/account-id');
const groupsByOrganization = require('../util/group-organizations');

const GroupListItemBase = require('./group-list-item-base');
const GroupListSection = require('./group-list-section');

/**
 * The list of groups in the dropdown menu at the top of the client.
 */
function GroupListV2({ analytics, serviceUrl, settings, store }) {
  const myGroups = store.getMyGroups();
  const myGroupsSorted = useMemo(() => groupsByOrganization(myGroups), [
    myGroups,
  ]);

  const featuredGroups = store.getFeaturedGroups();
  const featuredGroupsSorted = useMemo(
    () => groupsByOrganization(featuredGroups),
    [featuredGroups]
  );

  const currentGroups = store.getCurrentlyViewingGroups();
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
          store={store}
          heading="Currently Viewing"
          groups={currentGroupsSorted}
        />
      )}
      {featuredGroupsSorted.length > 0 && (
        <GroupListSection
          analytics={analytics}
          store={store}
          heading="Featured Groups"
          groups={featuredGroupsSorted}
        />
      )}
      {myGroupsSorted.length > 0 && (
        <GroupListSection
          analytics={analytics}
          store={store}
          heading="My Groups"
          groups={myGroupsSorted}
        />
      )}

      {canCreateNewGroup && (
        <GroupListItemBase
          className="new-group-btn"
          cssIcon="h-icon-add"
          href={newGroupLink}
          label="New private group"
        />
      )}

      {
        <span /> /* Work around https://github.com/developit/preact/issues/1567 */
      }
    </Fragment>
  );
}

GroupListV2.propTypes = {
  analytics: propTypes.object,
  serviceUrl: propTypes.func,
  settings: propTypes.object,
  store: propTypes.object,
};

GroupListV2.injectedProps = ['analytics', 'serviceUrl', 'settings', 'store'];

module.exports = GroupListV2;
