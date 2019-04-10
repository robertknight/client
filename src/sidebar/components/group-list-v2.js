'use strict';

const { Fragment, createElement } = require('preact');
const { useMemo } = require('preact/hooks');
const propTypes = require('prop-types');

const { isThirdPartyUser } = require('../util/account-id');
const groupsByOrganization = require('../util/group-organizations');

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

      <ul className="dropdown-menu__section dropdown-menu__section--no-header">
        {canCreateNewGroup && (
          <li className="dropdown-community-groups-menu__row dropdown-menu__row--unpadded new-group-btn">
            <a
              className="group-item-community-groups"
              href={newGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex="0"
            >
              <div className="group-icon-container">
                <i className="h-icon-add" />
              </div>
              <div className="group-details-community-groups">
                New private group
              </div>
            </a>
          </li>
        )}
      </ul>
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
