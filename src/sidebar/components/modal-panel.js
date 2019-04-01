'use strict';

const { createElement, createRef } = require('preact');
const { useEffect } = require('preact/hooks');
const propTypes = require('prop-types');
const classnames = require('classnames');

const { useTransition } = require('../util/hooks');

/**
 * A modal panel which overlays most of the area of the sidebar.
 */
function ModalPanel({ children, onClose }) {
  const enterDelay = 150;
  const { isEntering, isLeaving, leave: close } = useTransition({
    leaveDelay: 75,
    afterLeave: onClose,
  });

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };

  const contentRef = createRef();
  useEffect(() => {
    // Focus the pane after the enter transition completes. If the content is
    // focused before the transition completes, the background will move rather
    // than the content!
    setTimeout(() => {
      contentRef.current.focus();
    }, enterDelay);
  }, []);

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="modal-panel"
      onKeyDown={onKeyDown}
    >
      <div
        onClick={close}
        className={classnames({
          'modal-panel__backdrop': true,
          'is-entering': isEntering,
          'is-leaving': isLeaving,
        })}
      />
      <div
        className={classnames({
          'modal-panel__content': true,
          'is-entering': isEntering,
          'is-leaving': isLeaving,
        })}
        ref={contentRef}
        tabIndex="0"
      >
        <div className="u-layout-row">
          <span className="u-stretch" />
          <button
            aria-label="Close"
            className="modal-panel__close-btn"
            onClick={close}
          >
            ✕
          </button>
        </div>
        {children}
        <span className="u-stretch" />
      </div>
    </div>
  );
}

ModalPanel.propTypes = {
  children: propTypes.oneOfType([
    propTypes.object,
    propTypes.arrayOf(propTypes.object),
  ]),
  onClose: propTypes.func,
};

module.exports = ModalPanel;
