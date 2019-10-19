'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');
const { useCallback, useEffect, useRef, useState } = require('preact/hooks');

const observeElementSize = require('../util/observe-element-size');

/**
 * A toggle link at the bottom of an excerpt which controls whether it is
 * expanded or collapsed.
 */
function InlineControls({ isCollapsed, setCollapsed }) {
  const toggleTitle = isCollapsed
    ? 'Show the full excerpt'
    : 'Show the first few lines only';
  const toggleLabel = isCollapsed ? 'More' : 'Less';

  return (
    <div className="excerpt__inline-controls">
      <span className="excerpt__toggle-link">
        {/* TODO - Apply branding. */}
        <a
          href="#"
          onClick={() => setCollapsed(!isCollapsed)}
          title={toggleTitle}
        >
          {toggleLabel}
        </a>
      </span>
    </div>
  );
}

InlineControls.propTypes = {
  isCollapsed: propTypes.bool,
  setCollapsed: propTypes.func,
};

const noop = () => {};

/**
 * A container which truncates its content when they exceed a specified height.
 *
 * The collapsed state of the container can be handled either via internal
 * controls (if `inlineControls` is `true`) or by the caller using the
 * `collapse` prop.
 */
function Excerpt({
  children,
  collapse = false,
  collapsedHeight,
  inlineControls = true,
  onCollapsibleChanged = noop,
  onToggleCollapsed = noop,
  overflowHysteresis = 0,
}) {
  const [collapsedByInlineControls, setCollapsedByInlineControls] = useState(
    true
  );

  // Container for the excerpt's content.
  const contentElement = useRef(null);

  // Measured height of `contentElement` in pixels.
  const [contentHeight, setContentHeight] = useState(0);

  // Update the measured height of the content after the initial render and
  // when the size of the content element changes.
  const updateContentHeight = useCallback(() => {
    const newContentHeight = contentElement.current.clientHeight;
    setContentHeight(newContentHeight);

    const isCollapsible =
      newContentHeight > collapsedHeight + overflowHysteresis;
    onCollapsibleChanged({ collapsible: isCollapsible });
  }, [collapsedHeight, onCollapsibleChanged, overflowHysteresis]);

  useEffect(() => {
    const cleanup = observeElementSize(
      contentElement.current,
      updateContentHeight
    );
    updateContentHeight();
    return cleanup;
  }, [updateContentHeight]);

  // Render the (possibly truncated) content and controls for
  // expanding/collapsing the content.
  const overflowing = contentHeight > collapsedHeight + overflowHysteresis;
  const isCollapsed = inlineControls ? collapsedByInlineControls : collapse;
  const isExpandable = overflowing && isCollapsed;

  const contentStyle = {};
  if (contentHeight !== 0) {
    contentStyle['max-height'] = isExpandable ? collapsedHeight : contentHeight;
  }

  const setCollapsed = collapsed =>
    inlineControls
      ? setCollapsedByInlineControls(collapsed)
      : onToggleCollapsed(collapsed);

  return (
    <div className="excerpt" style={contentStyle}>
      <div test-name="excerpt-content" ref={contentElement}>
        {children}
      </div>
      <div
        onClick={() => setCollapsed(false)}
        className={classnames({
          excerpt__shadow: true,
          'excerpt__shadow--transparent': inlineControls,
          'is-hidden': !isExpandable,
        })}
        title="Show the full excerpt"
      />
      {overflowing && inlineControls && (
        <InlineControls
          isCollapsed={collapsedByInlineControls}
          setCollapsed={setCollapsed}
        />
      )}
    </div>
  );
}

Excerpt.propTypes = {
  /**
   * The content to render inside the container.
   */
  children: propTypes.object,

  /**
   * If `true`, the excerpt provides internal controls to expand and collapse
   * the content. If `false`, the caller sets the collapsed state via the
   * `collapse` prop.
   *
   * When using inline controls, the excerpt is initially collapsed.
   */
  inlineControls: propTypes.bool,

  /**
   * If the content should be truncated if its height exceeds
   * `collapsedHeight + overflowHysteresis`.
   */
  collapse: propTypes.bool,

  /**
   * Maximum height of the container when it is collapsed.
   */
  collapsedHeight: propTypes.number,

  /**
   * An additional margin of pixels by which the content height can exceed
   * `collapsedHeight` before it becomes collapsible.
   */
  overflowHysteresis: propTypes.number,

  /**
   * Called when the content height exceeds or falls below `collapsedHeight + overflowHysteresis`.
   */
  onCollapsibleChanged: propTypes.func,

  /**
   * When `inlineControls` is `false`, this function is called when the user
   * requests to expand the content by clicking a zone at the bottom of the
   * container.
   */
  onToggleCollapsed: propTypes.func,
};

module.exports = Excerpt;
