'use strict';

const { default: search } = require('approx-string-match');

/**
 * Functions to convert between text quotes and offsets within the text
 * content of a node.
 *
 * To convert between DOM ranges and text positions, use the functions in the
 * `./text-position` module.
 */

/**
 * Convert a text position to text offsets including the surrounding context.
 *
 * @param {string} text - Text content of the document
 * @param {number} start - Start offset within `text`
 * @param {number} end - End offset within `text`
 * @param {number} [contextLength] - Number of characters of context to use
 * @return Text quote
 */
function fromTextPosition(text, start, end, contextLength = 32) {
  const prefix = text.slice(start - contextLength, start);
  const suffix = text.slice(end, end + contextLength);

  return {
    exact: text.slice(start, end),
    prefix,
    suffix,
  };
}

/**
 * Locate a text quote within the text of a DOM element.
 *
 * Context can be provided as text that should precede or follow the quote to
 * identify the best match from available candidates.
 *
 * @param {string} text - Text content of the document to search
 * @param {string} exact - The text quote to find
 * @param {string} [prefix] - Optional expected text preceding the quote
 * @param {string} [suffix] - Optional expected text following the quote
 * @return {[start: number, end: number]}
 */
function toTextPosition(text, exact, prefix = '', suffix = '') {
  // Find matches for quote, allowing some errors.
  let maxErrors = exact.length * 0.2;
  const matches = search(text, exact, maxErrors);
  if (matches.length === 0) {
    throw new Error('Quote not found');
  }

  // From the matches for the quote, find the one with the best match for the
  // surrounding context.
  //
  // The current implementation always finds the best match for just
  // the quote first and then ranks matches by how well the context matches.
  // Therefore it may miss better matches where the match for just the quote
  // is not as good but the overall match for the quote-in-context is better.
  const errorCount = ({ start, end }) => {
    const pattern = prefix + exact + suffix;
    const nearbyText = text.slice(start - prefix.length, end + suffix.length);

    // Since `maxErrors` is set to `pattern.length` here, this call to `search`
    // should always return a match.
    const matches = search(nearbyText, pattern, pattern.length);

    return matches[0].errors;
  };

  let bestMatch = matches[0];
  let minErrors = errorCount(bestMatch);

  for (let i = 1; i < matches.length; i++) {
    const match = matches[i];
    const errors = errorCount(match);
    if (errors < minErrors) {
      bestMatch = match;
      minErrors = errors;
    }
  }

  return [bestMatch.start, bestMatch.end];
}

module.exports = {
  fromTextPosition,
  toTextPosition,
};
