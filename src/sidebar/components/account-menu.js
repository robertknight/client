'use strict';

const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');

const Menu = require('./menu');
const MenuItem = require('./menu-item');
const MenuSection = require('./menu-section');
const { withPropsFromStore } = require('./util/connect-store');
const { username: extractUsername } = require('../util/account-id');
const { withServices } = require('../util/service-context');

/**
 * Menu displaying account-related information and actions.
 */
function AccountMenu({ onLogout, onShowHelp, profile, serviceUrl }) {
  let displayName;
  let username = extractUsername(profile.userid);

  if (profile.user_info) {
    displayName = profile.user_info.display_name;
  }

  const loggedIn = profile.userid !== null;
  const accountSettingsUrl = serviceUrl('account.settings');
  const profileUrl = serviceUrl('user', { user: username });

  // TODO - Support third-party accounts:
  // - Call publisher-provided handler for account profile link.
  // - Call publisher-provided handler for Log out link, or hide if none
  //   is provided.

  return (
    <Menu
      align="right"
      toggle={
        loggedIn ? (
          <i className="h-icon-account" />
        ) : (
          <i className="h-icon-arrow-drop-down top-bar__dropdown-arrow" />
        )
      }
    >
      <MenuSection>
        {loggedIn && <MenuItem href={profileUrl} label={displayName} />}
        {loggedIn && accountSettingsUrl && (
          <MenuItem href={accountSettingsUrl} label="Account settings" />
        )}
        <MenuItem onClick={onShowHelp} label="Help" />
      </MenuSection>
      {loggedIn && <MenuItem onClick={onLogout} label="Log out" />}
      {
        <span /> /* work around https://github.com/developit/preact/issues/1567 */
      }
    </Menu>
  );
}

AccountMenu.propTypes = {
  /**
   * Callback to invoke when user clicks "Log out" button.
   */
  onLogout: propTypes.func.isRequired,

  /**
   * Callback to invoke when user clicks "Help" button.
   */
  onShowHelp: propTypes.func.isRequired,

  /**
   * The user's profile, retrieved from the `/api/profile` endpoint.
   */
  profile: propTypes.object.isRequired,

  serviceUrl: propTypes.func.isRequired,
};

AccountMenu.injectedProps = ['serviceUrl'];

module.exports = withPropsFromStore(withServices(AccountMenu), {
  profile: store => store.profile(),
});
