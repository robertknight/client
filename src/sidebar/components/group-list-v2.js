'use strict';

const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');

const { isThirdPartyUser } = require('../util/account-id');
const memoize = require('../util/memoize');
const groupsByOrganization = require('../util/group-organizations');

const myGroupOrgs = memoize(groupsByOrganization);
const featuredGroupOrgs = memoize(groupsByOrganization);
const currentlyViewingGroupOrgs = memoize(groupsByOrganization);

const GroupListSection = require('./group-list-section');

/**
 * The list of groups in the dropdown menu at the top of the client.
 */
function GroupListV2({ analytics, serviceUrl, settings, store }) {
  const currentlyViewingGroups = myGroupOrgs(store.getCurrentlyViewingGroups());
  const featuredGroups = featuredGroupOrgs(store.getFeaturedGroups());
  const myGroups = currentlyViewingGroupOrgs(store.getMyGroups());

  const { authDomain } = settings;
  const userid = store.profile().userid;
  const canCreateNewGroup = userid && !isThirdPartyUser(userid, authDomain);
  const newGroupLink = serviceUrl('groups.new');

  return (
    <Fragment>
      {currentlyViewingGroups.length > 0 && (
        <GroupListSection
          analytics={analytics}
          store={store}
          heading="Currently Viewing"
          groups={currentlyViewingGroups}
        />
      )}
      {featuredGroups.length > 0 && (
        <GroupListSection
          analytics={analytics}
          store={store}
          heading="Featured Groups"
          groups={featuredGroups}
        />
      )}
      {myGroups.length > 0 && (
        <GroupListSection
          analytics={analytics}
          store={store}
          heading="My Groups"
          groups={myGroups}
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

GroupListV2.injectedProps = [
  'analytics',
  'serviceUrl',
  'settings',
  'store',
];

module.exports = GroupListV2;
