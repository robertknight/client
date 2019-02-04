'use strict';

const { Component, createElement } = require('preact');
const propTypes = require('prop-types');

const dateUtil = require('../util/date');
const time = require('../util/time');

class Timestamp extends Component {
  constructor(props) {
    super(props);

    this.state = {
      cancelTimestampRefresh: null,
      relativeTimestamp: null,
      absoluteTimestamp: '',
    };
    this._updateTimestamp();
  }

  componentDidUpdate(prevProps) {
    if (this.props.timestamp !== prevProps.timestamp) {
      this._updateTimestamp();
    }
  }

  componentWillUnmount() {
    if (this.state.cancelTimestampRefresh) {
      this.state.cancelTimestampRefresh();
    }
  }

  render() {
    const { className, href } = this.props;
    const { absoluteTimestamp, relativeTimestamp } = this.state;

    if (!href) {
      return (
        <span className={className} title={absoluteTimestamp}>
          {relativeTimestamp}
        </span>
      );
    } else {
      return (
        <a
          className={className}
          target="_blank"
          rel="noreferrer noopener"
          title={absoluteTimestamp}
          href={href}
        >
          {relativeTimestamp}
        </a>
      );
    }
  }

  _updateTimestamp() {
    if (this.state.cancelTimestampRefresh) {
      this.state.cancelTimestampRefresh();
    }

    const timestamp = this.props.timestamp;
    const relativeTimestamp = time.toFuzzyString(timestamp);
    const absoluteTimestamp = dateUtil.format(new Date(timestamp));

    this.setState({
      relativeTimestamp,
      absoluteTimestamp,
    });

    if (!timestamp) {
      return;
    }

    const cancelTimestampRefresh = time.decayingInterval(timestamp, () => {
      this._updateTimestamp();
    });
    this.setState({ cancelTimestampRefresh });
  }
}

Timestamp.propTypes = {
  className: propTypes.string,
  href: propTypes.string,
  timestamp: propTypes.string,
};

module.exports = Timestamp;
