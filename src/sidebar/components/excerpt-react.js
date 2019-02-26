'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { Component, createRef, createElement } = require('preact');

const ExcerptOverflowMonitor = require('../util/excerpt-overflow-monitor');

/**
 * A container which truncates tall children.
 *
 * When the container is collapsible, it can be expanded/collapsed by controls
 * which are either provided inline (if `inlineControls` is true) or by
 * external controls.
 */
class Excerpt extends Component {
  constructor(props) {
    super(props);

    this.state = {
      collapse: true,
      overflowing: false,
    };
    this.expand = this.expand.bind(this);
    this.toggle = this.toggle.bind(this);
    this._contentElem = createRef();

    this._overflowMonitor = new ExcerptOverflowMonitor(
      {
        getState: () => ({
          enabled: this.props.enabled,
          animate: this.props.animate,
          collapsedHeight: this.props.collapsedHeight,
          collapse: this.state.collapse,
          overflowHysteresis: this.props.overflowHysteresis,
        }),

        contentHeight: () => {
          const el = this._contentElem.current;
          if (!el) {
            return null;
          }
          return el.scrollHeight;
        },

        onOverflowChanged: overflowing => {
          this.setState({ overflowing });
          if (this.props.onCollapsibleChanged) {
            this.props.onCollapsibleChanged({ collapsible: overflowing });
          }
        },
      },
      window.requestAnimationFrame
    );
  }

  expand() {
    this.setState({ collapse: false });
  }

  toggle() {
    this.setState(s => ({ collapse: !s.collapse }));
  }

  static getDerivedStateFromProps({ collapse }) {
    if (typeof collapse !== 'undefined') {
      return { collapse };
    }
    return {};
  }

  componentDidMount() {
    this._contentElem.current.addEventListener(
      'load',
      this._overflowMonitor.check
    );
    window.addEventListener('resize', this._overflowMonitor.check);

    this._overflowMonitor.check();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._overflowMonitor.check);
  }

  render() {
    const { children, enabled, inlineControls } = this.props;
    const { collapse, overflowing } = this.state;

    if (!enabled) {
      return <div ref={this._contentElem}>{children}</div>;
    }

    const isCollapsible = overflowing && !collapse;
    const isExpandable = overflowing && collapse;

    const contentStyle = this._overflowMonitor.contentStyle();
    const bottomShadowStyles = {
      excerpt__shadow: true,
      'excerpt__shadow--transparent': inlineControls,
      'is-hidden': !isExpandable,
    };
    const showInlineControls = overflowing && inlineControls;
    const toggleTitle = isCollapsible
      ? 'Show the first few lines only'
      : 'Show the full excerpt';
    const toggleLabel = isCollapsible ? 'Less' : 'More';

    return (
      <div className="excerpt__container">
        <div className="excerpt" style={contentStyle} ref={this._contentElem}>
          {children}
          <div
            onClick={this.expand}
            className={classnames(bottomShadowStyles)}
            title="Show the full excerpt"
          />
          {showInlineControls && (
            <div className="excerpt__inline-controls">
              <span className="excerpt__toggle-link">
                {/* TODO - Apply branding. */}
                <a href="#" onClick={this.toggle} title={toggleTitle}>
                  {toggleLabel}
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
}

Excerpt.propTypes = {
  /**
   * `true` if expanding/collapsing the container should be animated.
   */
  animate: propTypes.bool,

  children: propTypes.element,

  /**
   * `true` if the content should be truncated if its height exceeds
   * `collapsedHeight + overflowHysteresis`.
   */
  collapse: propTypes.bool,

  /** Height of the container when it is collapsed. */
  collapsedHeight: propTypes.number,

  /**
   * `true` if truncation is enabled.
   */
  enabled: propTypes.bool,

  /**
   * If `true`, display controls to expand or collapse the container.
   */
  inlineControls: propTypes.bool,

  /**
   * Called when the content height exceeds or falls below `collapsedHeight + overflowHysteresis`.
   */
  onCollapsibleChanged: propTypes.func,

  /**
   * An additional margin of pixels by which the content height can exceed
   * `collapsedHeight` before it becomes collapsible.
   */
  overflowHysteresis: propTypes.number,
};

Excerpt.defaultProps = {
  animate: true,
  enabled: true,
  inlineControls: true,
  overflowHysteresis: 0,
};

module.exports = Excerpt;
