'use strict';

const { Component, createElement } = require('preact');
const shallowEqual = require('shallowequal');

/**
 * Component wrapper which prevents re-rendering if none of the inputs have
 * changed.
 *
 * See https://reactjs.org/docs/react-api.html#reactmemo
 */
function memo(Wrapped) {
  class MemoWrapper extends Component {
    shouldComponentUpdate(nextProps) {
      return !shallowEqual(this.props, nextProps);
    }

    render() {
      return <Wrapped {...this.props} />;
    }
  }
  MemoWrapper.propTypes = Wrapped.propTypes;
  MemoWrapper.displayName = `memo(${Wrapped.name})`;
  return MemoWrapper;
}

module.exports = {
  memo,
};
