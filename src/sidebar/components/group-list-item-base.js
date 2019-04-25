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
  const iconClass = 'group-list-item__icon group-list-item__icon--organization';
  const iconIsUrl = icon && icon.indexOf('/') !== -1;

  return (
    <div
      className={classnames('group-list-item__item', className, {
        'group-list-item__item--submenu': isSubmenuItem,
      })}
      {...(onClick && onActivate('menuitem', onClick))}
    >
      <div className="group-list-item__icon-container">
        {icon &&
          (iconIsUrl ? (
            <img className={iconClass} alt={iconAlt} src={icon} />
          ) : (
            <SvgIcon name={icon} />
          ))}
      </div>
      <div
        className={classnames('group-list-item__details', {
          'group-list-item__details--submenu': isSubmenuItem,
        })}
      >
        {href && (
          <a
            className="group-list-item__label"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
          >
            {label}
          </a>
        )}
        {!href && (
          <span className="group-list-item__label" title={title}>
            {label}
          </span>
        )}
      </div>
      {typeof isSubmenuVisible === 'boolean' && (
        <div
          className="group-list-item__toggle"
          aria-label="Toggle item sub-menu"
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
