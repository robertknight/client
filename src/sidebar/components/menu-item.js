'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const propTypes = require('prop-types');

const { onActivate } = require('../util/on-activate');

const SvgIcon = require('./svg-icon');

/**
 * An item in a dropdown menu.
 *
 * Dropdown menu items display an icon, a label and can optionally have a submenu
 * associated with them.
 *
 * When clicked, menu items either open an external link, if the `href` prop
 * is provided, or perform a custom action via the `onClick` callback.
 *
 * The icon can either be an external SVG image, referenced by URL, or a named
 * icon rendered by an `SvgIcon`.
 */
function MenuItem({
  href,
  icon,
  iconAlt,
  isDisabled,
  isExpanded,
  isSelected,
  isSubmenuVisible,
  label,
  onClick,
  onToggleSubmenu,
  style,
}) {
  const iconClass = 'menu-item__icon';
  const iconIsUrl = icon && icon.indexOf('/') !== -1;
  const labelClass = classnames('menu-item__label', {
    'menu-item__label--submenu': style === 'submenu',
  });

  return (
    <div
      aria-checked={isSelected}
      className={classnames('menu-item', {
        'menu-item--submenu': style === 'submenu',
        'menu-item--shaded': style === 'shaded',
        'is-disabled': isDisabled,
        'is-expanded': isExpanded,
        'is-selected': isSelected,
      })}
      role="menuitem"
      {...onClick && onActivate('menuitem', onClick)}
    >
      {icon !== undefined && (
        <div className="menu-item__icon-container">
          {icon &&
            (iconIsUrl ? (
              <img className={iconClass} alt={iconAlt} src={icon} />
            ) : (
              <SvgIcon name={icon} size={10} />
            ))}
        </div>
      )}
      {href && (
        <a
          className={labelClass}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>
      )}
      {!href && <span className={labelClass}>{label}</span>}
      {typeof isSubmenuVisible === 'boolean' && (
        <div
          className="menu-item__toggle"
          // TODO - Look into why just passing `isSubmenuVisible` doesn't work
          // when false. No attribute is added and VoiceOver doesn't read the item
          // as collapsed.
          aria-expanded={isSubmenuVisible ? 'true' : 'false'}
          aria-label={`Show actions for ${label}`}
          {...onActivate('button', onToggleSubmenu)}
        >
          <SvgIcon name={isSubmenuVisible ? 'collapse-menu' : 'expand-menu'} />
        </div>
      )}
    </div>
  );
}

MenuItem.propTypes = {
  /**
   * URL of the external link to open when this item is clicked.
   * Either the `href` or an  `onClick` callback should be supplied.
   */
  href: propTypes.string,

  /** Alt text for icon. */
  iconAlt: propTypes.string,

  /**
   * Name or URL of icon to display. If the value is a URL it is displayed
   * using an `<img>`, if it is a name it is displayed using `SvgIcon`.
   *
   * If the property is `null` a blank placeholder is displayed in place of an
   * icon. If the property is omitted, no placeholder is displayed.
   */
  icon: propTypes.string,

  /**
   * Dim the label to indicate that this item is not currently available.
   *
   * The `onClick` callback will still be invoked when this item is clicked and
   * the submenu, if any, can still be toggled.
   */
  isDisabled: propTypes.bool,

  /**
   * Indicates that the submenu associated with this item is currently open.
   */
  isExpanded: propTypes.bool,

  /**
   * Display an indicator to show that this menu item represents something
   * which is currently selected/active/focused.
   */
  isSelected: propTypes.bool,

  /**
   * If present, display a button to toggle the sub-menu associated with this
   * item and indicate the current state; `true` if the submenu is visible.
   */
  isSubmenuVisible: propTypes.bool,

  /** Label of the menu item. */
  label: propTypes.string.isRequired,

  /** Callback to invoke when the menu item is clicked. */
  onClick: propTypes.func,

  /**
   * Callback when the user clicks on the toggle to change the expanded
   * state of the menu.
   */
  onToggleSubmenu: propTypes.func,

  /** Style of menu item. */
  style: propTypes.oneOf(['submenu', 'shaded']),
};

module.exports = MenuItem;
