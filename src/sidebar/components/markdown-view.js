'use strict';

const classnames = require('classnames');
const { Component, createRef, createElement } = require('preact');
const propTypes = require('prop-types');
const shallowEqual = require('shallowequal');

const { replaceLinksWithEmbeds } = require('../media-embedder');
const renderMarkdown = require('../render-markdown');
const memoize = require('../util/memoize');
const { memo } = require('../util/react');

/**
 * A component which renders markdown as HTML and replaces recognized links
 * with embedded video/audio.
 */
class MarkdownView extends Component {
  constructor(props) {
    super(props);

    this._content = createRef();
    this._render = memoize(renderMarkdown);
  }

  shouldComponentUpdate(props) {
    return !shallowEqual(this.props, props);
  }

  componentDidUpdate() {
    this._replaceLinksWithEmbeds();
  }

  componentDidMount() {
    this._replaceLinksWithEmbeds();
  }

  _replaceLinksWithEmbeds() {
    if (this._content.current) {
      replaceLinksWithEmbeds(this._content.current);
    }
  }

  render() {
    const classes = classnames(this.props.textClass || {});
    const markup = {
      __html: this._render(this.props.markdown),
    };
    return (
      <div
        className={`markdown-body ${classes}`}
        ref={this._content}
        dangerouslySetInnerHTML={markup}
      />
    );
  }
}

MarkdownView.propTypes = {
  /** The string of markdown to display. */
  markdown: propTypes.string,

  /**
   * A CSS classname-to-boolean map of classes to apply to the container of
   * the rendered markdown.
   */
  textClass: propTypes.object,
};

module.exports = memo(MarkdownView);
