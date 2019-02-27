'use strict';

const { createElement } = require('preact');
const classnames = require('classnames');
const propTypes = require('prop-types');

const Excerpt = require('./excerpt-react');

/**
 * Display the excerpt of a document (the "quote") associated with an
 * annotation in a collapsible container.
 */
function AnnotationQuote({ isOrphan, quote }) {
  if (!quote) {
    return null;
  }

  return (
    <section
      className={classnames({
        'annotation-quote-list': true,
        'is-orphan': isOrphan,
      })}
    >
      <Excerpt
        collapsedHeight={35}
        inlineControls={true}
        overflowHysteresis={20}
        contentData={quote}
      >
        {/* TODO - h-branding="selectionFontFamily" */}
        <blockquote className="annotation-quote">{quote}</blockquote>
      </Excerpt>
    </section>
  );
}

AnnotationQuote.propTypes = {
  /** The text of the quote. */
  quote: propTypes.string,

  /** Indicate whether the quote was found in the current document. */
  isOrphan: propTypes.bool,
};

module.exports = AnnotationQuote;
