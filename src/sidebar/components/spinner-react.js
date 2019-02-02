'use strict';

const { createElement } = require('preact');

function Spinner() {
  return (
    <div className="spinner__container">
      <span className="spinner">
        <span />
        <span />
      </span>
    </div>
  );
}

Spinner.propTypes = {};

module.exports = Spinner;
