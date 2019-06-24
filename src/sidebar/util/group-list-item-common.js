'use strict';

/**
 * @typedef {import('../../types/api').Group} Group
 */

/**
 * @param {Group} group
 * @return {string}
 */
function orgName(group) {
  return group.organization && group.organization.name;
}

function trackViewGroupActivity(analytics) {
  analytics.track(analytics.events.GROUP_VIEW_ACTIVITY);
}

module.exports = {
  orgName,
  trackViewGroupActivity,
};
