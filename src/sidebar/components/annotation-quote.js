'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const propTypes = require('prop-types');

const { withServices } = require('../util/service-context');
const { applyTheme } = require('../util/theme');
const Excerpt = require('./excerpt');

/**
 * Display the selected text from the document associated with an annotation.
 */
function AnnotationQuote({ isOrphan, quote, settings = {} }) {
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
          style={applyTheme(['selectionFontFamily'], settings)}
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
  settings: propTypes.object,
};

AnnotationQuote.injectedProps = ['settings'];

module.exports = withServices(AnnotationQuote);
