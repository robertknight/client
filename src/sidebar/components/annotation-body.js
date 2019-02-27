'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const Excerpt = require('./excerpt-react');
const MarkdownEditor = require('./markdown-editor');

/**
 * Display the body/text of an annotation in a collapsible container.
 */
function AnnotationBody({
  collapseBody,
  isEditing,
  isHidden,
  onCollapsibleChanged,
  onEditText,
  text,
}) {
  // TODO - Include tags here?
  const hasContent = text.length > 0;
  const customTextClass = {
    'annotation-body': isHidden,
    'is-hidden': isHidden,
    'has-content': hasContent,
  };

  return (
    <section className="annotation-body">
      <Excerpt
        enabled={!isEditing}
        inlineControls={false}
        onCollapsibleChanged={onCollapsibleChanged}
        collapse={collapseBody}
        collapsedHeight={400}
        overflowHysteresis={20}
        contentData={text}
      >
        <MarkdownEditor
          text={text}
          customTextclassName={customTextClass}
          onEditText={onEditText}
          readOnly={!isEditing}
        />
      </Excerpt>
    </section>
  );
}

AnnotationBody.propTypes = {
  /** `true` if long annotation bodies should be collapsed. */
  collapseBody: propTypes.bool,

  /**
   * Called when the height of this annotation body exceeds or falls below
   * the threshold for being collapsible.
   */
  onCollapsibleChanged: propTypes.func,

  /** `true` if the annotation body should be editable. */
  isEditing: propTypes.bool,

  /** `true` if the annotation has been hidden by a moderator. */
  isHidden: propTypes.bool,

  /** Called when the user changes the content. */
  onEditText: propTypes.func,

  /** The annotation's content. */
  text: propTypes.string,
};

module.exports = AnnotationBody;
