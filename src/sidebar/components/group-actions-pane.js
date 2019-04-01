'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const { injectProps } = require('../util/inject-props');
const ModalPanel = require('./modal-panel');
const Icon = require('./icon');

function GroupActionsPane({ analytics, groups, group, onClose }) {
  const leave = () => {
    const message = `Are you sure you want to leave the group "${
      group.name
    }"?'`;
    if (window.confirm(message)) {
      analytics.track(analytics.events.GROUP_LEAVE);
      groups.leave(group.id);
    }
  };

  return (
    <ModalPanel onClose={onClose}>
      <h1 className="group-actions-pane__title">{group.name}</h1>
      <a
        href={group.links.html}
        target="_blank"
        rel="noopener noreferrer"
        className="group-actions-pane__link"
      >
        View activity in group
        <Icon type="open-external-link" />
      </a>
      <button className="button button--muted" onClick={leave}>
        Leave this group
      </button>
    </ModalPanel>
  );
}

GroupActionsPane.propTypes = {
  group: propTypes.object,
  onClose: propTypes.func,

  analytics: propTypes.object,
  groups: propTypes.object,
};

GroupActionsPane.injectedProps = ['analytics', 'groups'];

module.exports = injectProps(GroupActionsPane);
