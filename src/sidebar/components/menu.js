'use strict';

const classnames = require('classnames');

const MenuItem = require('./menu-item');

function Menu({ children }) {
  const x = classnames();
  return (
    <Fragment>
      <MenuItem/>
      <button/>
      <div className="menu__content" role="menu">
      </div>
    </Fragment>
  );
}

Menu.propTypes = {
  align: propTypes.oneOf(['left', 'right']),
  label: propTypes.object,
  children: propTypes.arrayOf(propTypes.object),
};
