'use strict';

const classNames = require('classnames');
const { createElement } = require('preact');

const SvgIcon = require('./svg-icon');

function CancelButton({
  className = '',
  onClick,
  ariaLabel,
  label = 'Cancel',
}) {
  return (
    <button
      className={classNames('sidebar-panel__close-btn', className)}
      onClick={onClick}
      aria-label={ariaLabel || label}
    >
      <SvgIcon name="cancel" className="action-button__icon--compact" />
      {label}
    </button>
  );
}

module.exports = CancelButton;
