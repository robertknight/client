'use strict';

const { Fragment, createElement } = require('preact');
const { useCallback, useEffect, useRef, useState } = require('preact/hooks');
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

let ignoreNextClick = false;

/**
 * A drop-down menu.
 */
function Menu({
  align = 'left',
  children,
  label,
  menuIndicator = true,
  title,
}) {
  const [isOpen, setOpen] = useState(false);

  // Toggle menu when user presses toggle button. The menu is shown on mouse
  // press for a more responsive/native feel but also handles a click event for
  // activation via other input methods.
  const toggleMenu = event => {
    // If the menu was opened on press, don't close it again on the subsequent
    // mouse up.
    if (event.type === 'mousedown') {
      ignoreNextClick = true;
    } else if (event.type === 'click' && ignoreNextClick) {
      ignoreNextClick = false;
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    setOpen(!isOpen);
  };
  const closeMenu = useCallback(() => setOpen(false), [setOpen]);

  // Close menu when user clicks outside or presses Esc.
  const menuRef = useRef();
  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    const unlisten = listen(
      document.body,
      ['keypress', 'click', 'mousedown'],
      event => {
        if (event.type === 'keypress' && event.key !== 'Escape') {
          return;
        }
        if (event.type === 'click' && ignoreNextClick) {
          ignoreNextClick = false;
          return;
        }
        if (
          event.type === 'mousedown' &&
          menuRef.current &&
          menuRef.current.contains(event.target)
        ) {
          // Close the menu as soon as the user presses the mouse outside the
          // menu, but only on clicks inside the menu.
          return;
        }
        closeMenu();
      }
    );

    return unlisten;
  }, [closeMenu, isOpen]);

  const menuStyle = {
    [align]: 0,
  };

  return (
    <div className="menu" ref={menuRef}>
      <button
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup={true}
        className="menu__toggle"
        onMouseDown={toggleMenu}
        onClick={toggleMenu}
        title={title}
      >
        {label}
        {menuIndicator && (
          <span className="menu__toggle-arrow">
            <SvgIcon name="expand-menu" />
          </span>
        )}
      </button>
      {isOpen && (
        <Fragment>
          <div className="menu__arrow" />
          <div className="menu__content" role="menu" style={menuStyle}>
            {children}
          </div>
        </Fragment>
      )}
    </div>
  );
}

Menu.propTypes = {
  /**
   * Whether the menu content is aligned with the left (default) or right edges
   * of the toggle element.
   */
  align: propTypes.oneOf(['left', 'right']),

  /**
   * Label element for the toggle button that hides and shows the menu.
   */
  label: propTypes.object.isRequired,

  /**
   * Menu items and sections to display in the content area of the menu.
   *
   * These are typically `MenuSection` and `MenuItem` components, but other
   * custom content is also allowed.
   */
  children: propTypes.array.isRequired,

  /**
   * A title for the menu. This is important for accessibility if the menu's
   * toggle button has only an icon as a label.
   */
  title: propTypes.string.isRequired,

  /**
   * Whether to display an indicator next to the label that there is a
   * dropdown menu.
   */
  menuIndicator: propTypes.bool,
};

module.exports = Menu;
