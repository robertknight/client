'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const icons = {
  'more-options': require('../../images/icons/more-options.svg'),
  'open-external-link': require('../../images/icons/open-external-link.svg'),
};

function Icon({ type }) {
  const iconData = icons[type];
  const content = `data:image/svg+xml;utf8,${iconData}`;
  return <img src={content} />;
}

Icon.propTypes = {
  type: propTypes.string,
};

module.exports = Icon;
