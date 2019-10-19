'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const propTypes = require('prop-types');

const Excerpt = require('./excerpt');

/**
 * Display the selected text from the document associated with an annotation.
 */
function AnnotationQuote({ isOrphan, quote }) {
  return (
    <section
      className={classnames('annotation-quote-list', isOrphan && 'is-orphan')}
    >
      <Excerpt
        collapsedHeight={35}
        inlineControls={true}
        overflowHystersis={20}
      >
        <blockquote
          className="annotation-quote"
          h-branding="selectionFontFamily"
        >
          {quote}
        </blockquote>
      </Excerpt>
    </section>
  );
}

AnnotationQuote.propTypes = {
  isOrphan: propTypes.bool,
  quote: propTypes.string,
};

module.exports = AnnotationQuote;
