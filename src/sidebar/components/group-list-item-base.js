'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const propTypes = require('prop-types');

/**
 * An item in the groups menu.
 */
function GroupListItemBase({
  className = '',
  cssIcon,
  href,
  imgAlt,
  imgIcon,
  label,
  onClick,
  title,
}) {
  const iconClass = 'group-list-item__icon group-list-item__icon--organization';

  return (
    <div
      className={classnames('group-list-item__item', className)}
      tabIndex={0}
      onClick={onClick}
    >
      <div className="group-list-item__icon-container">
        {cssIcon && <i className={classnames(iconClass, cssIcon)} />}
        {imgIcon && <img className={iconClass} alt={imgAlt} src={imgIcon} />}
      </div>
      <div className="group-list-item__details">
        {href && (
          <a
            className="group-list-item__name-link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
          >
            {label}
          </a>
        )}
        {!href && (
          <a className="group-list-item__name-link" href="" title={title}>
            {label}
          </a>
        )}
      </div>
    </div>
  );
}

GroupListItemBase.propTypes = {
  /** Additional class names to apply to the item. */
  className: propTypes.string,

  /** CSS class to use if this item displays an icon font icon. */
  cssIcon: propTypes.string,

  /**
   * URL of the external link to open when this item is clicked.
   * Either the `href` or an  `onClick` callback should be supplied.
   */
  href: propTypes.string,

  /** Alt text for the `<img>` icon. */
  imgAlt: propTypes.string,

  /** URL of the `<img>` icon. */
  imgIcon: propTypes.string,

  /** Label of the menu item. */
  label: propTypes.string.isRequired,

  /** Callback to invoke when the menu item is clicked. */
  onClick: propTypes.func,

  /** Title attribute for the item. */
  title: propTypes.string,
};

module.exports = GroupListItemBase;
