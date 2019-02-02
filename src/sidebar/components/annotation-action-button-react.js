'use strict';

const propTypes = require('prop-types');
const { createElement } = require('preact');

function AnnotationActionButton({ icon, isDisabled, label, onClick }) {
  // TODO - Re-implement tooltips.
  return (
    <button
      className="btn btn-clean annotation-action-btn"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
    >
      <i className={icon + ' btn-icon'} />
    </button>
  );
}

AnnotationActionButton.propTypes = {
  icon: propTypes.string,
  isDisabled: propTypes.bool,
  label: propTypes.string,
  onClick: propTypes.func,
};

module.exports = AnnotationActionButton;
