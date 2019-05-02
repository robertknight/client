'use strict';

const { Fragment, createElement } = require('preact');
const { useCallback, useEffect, useState } = require('preact/hooks');
const propTypes = require('prop-types');

const SvgIcon = require('./svg-icon');

/**
 * Attach `handler` as an event listener for `events` on `element`.
 *
 * @return {function} Function which removes the event listeners.
 */
function listen(element, events, handler) {
  events.forEach(event => element.addEventListener(event, handler));
  return () => {
    events.forEach(event => element.removeEventListener(event, handler));
  };
}

function Menu({ align = 'left', children, label, title }) {
  const [isOpen, setOpen] = useState(false);
  const toggleMenu = () => setOpen(!isOpen);
  const closeMenu = useCallback(() => setOpen(false), [setOpen]);

  // Close menu when user clicks outside or presses Esc.
  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    const unlisten = listen(document.body, ['keypress', 'click'], event => {
      if (event.type === 'keypress' && event.key !== 'Escape') {
        return;
      }
      closeMenu();
    });

    return unlisten;
  }, [closeMenu, isOpen]);

  const menuStyle = {
    [align]: 0,
  };

  return (
    <div className="menu">
      <button
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup={true}
        className="menu__toggle"
        onClick={toggleMenu}
        title={title}
      >
        {label}
        <SvgIcon name="expand-menu" />
      </button>
      {isOpen && (
        <Fragment>
          <div className="menu__arrow" />
          <div className="menu__content" role="menu" style={menuStyle}>
            {children}
          </div>
        </Fragment>
      )}
      {
        // Work around https://github.com/developit/preact/issues/1567
        <span />
      }
    </div>
  );
}

Menu.propTypes = {
  align: propTypes.oneOf(['left', 'right']),
  label: propTypes.object.isRequired,
  children: propTypes.array.isRequired,
  title: propTypes.string.isRequired,
};

module.exports = Menu;
