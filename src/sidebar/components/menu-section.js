'use strict';

const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');

/**
 * Group a set of menu items together visually, with an optional header.
 */
function MenuSection({ heading, children }) {
  return (
    <Fragment>
      {heading && <h2 className="menu-section__heading">{heading}</h2>}
      <ul className="menu-section__content">
        {children.map(child => (
          <li key={child.key}>
            {child}
          </li>
        ))}
      </ul>
    </Fragment>
  );
}

MenuSection.propTypes = {
  /**
   * Heading displayed at the top of the menu.
   */
  heading: propTypes.string,

  /**
   * Menu items to display in this section.
   */
  children: propTypes.array.isRequired,
};

module.exports = MenuSection;
