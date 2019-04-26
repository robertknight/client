'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const propTypes = require('prop-types');

const SvgIcon = require('./svg-icon');
const { onActivate } = require('../util/on-activate');

/**
 * An item in the groups menu.
 *
 * This is a presentational base component for items in the groups menu. It has
 * no specific logic associated with it.
 */
function GroupListItemBase({
  className = '',
  href,
  icon,
  iconAlt,
  isSubmenuVisible,
  isSubmenuItem = false,
  label,
  onClick,
  onToggleSubmenu,
  title,
}) {
  const iconClass = 'group-list-item__icon';
  const iconIsUrl = icon && icon.indexOf('/') !== -1;
  const labelClass = classnames('group-list-item__label', {
    'group-list-item__label--submenu': isSubmenuItem,
  });

  return (
    <div
      className={classnames('group-list-item', className, {
        'group-list-item--submenu': isSubmenuItem,
      })}
      {...onClick && onActivate('menuitem', onClick)}
    >
      <div className="group-list-item__icon-container">
        {icon &&
          (iconIsUrl ? (
            <img className={iconClass} alt={iconAlt} src={icon} />
          ) : (
            <SvgIcon name={icon} />
          ))}
      </div>
      {href && (
        <a
          className={labelClass}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={title}
        >
          {label}
        </a>
      )}
      {!href && (
        <span className={labelClass} title={title}>
          {label}
        </span>
      )}
      {typeof isSubmenuVisible === 'boolean' && (
        <div
          className="group-list-item__toggle"
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

GroupListItemBase.propTypes = {
  /** Additional class names to apply to the item. */
  className: propTypes.string,

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
   */
  icon: propTypes.string,

  /**
   * If present, display a button to toggle the sub-menu associated with this
   * item and indicate the current state; `true` if the submenu is visible.
   */
  isSubmenuVisible: propTypes.bool,

  /**
   * `true` if this item is part of a sub-menu associated with a top-level item.
   */
  isSubmenuItem: propTypes.bool,

  /** Label of the menu item. */
  label: propTypes.string.isRequired,

  /** Callback to invoke when the menu item is clicked. */
  onClick: propTypes.func,

  /**
   * Callback when the user clicks on the toggle to change the expanded
   * state of the menu.
   */
  onToggleSubmenu: propTypes.func,

  /** Title attribute for the item. */
  title: propTypes.string,
};

module.exports = GroupListItemBase;
