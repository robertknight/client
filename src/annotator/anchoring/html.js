import { RangeAnchor, TextPositionAnchor, TextQuoteAnchor } from './types';

/**
 * @typedef {import('../../types/api').Selector} Selector
 */

/**
 * Anchor a set of selectors.
 *
 * This function converts a set of selectors into a document range.
 * It encapsulates the core anchoring algorithm, using the selectors alone or
 * in combination to establish the best anchor within the document.
 *
 * @param {Element} root - The root element of the anchoring context.
 * @param {Selector[]} selectors - The selectors to try.
 * @return {Promise<Range>}
 */
export async function anchor(root, selectors) {
  let positionSelector = null;
  let quoteSelector = null;
  let rangeSelector = null;

  // Collect all the selectors
  for (let selector of selectors) {
    switch (selector.type) {
      case 'TextPositionSelector':
        positionSelector = selector;
        break;
      case 'TextQuoteSelector':
        quoteSelector = selector;
        break;
      case 'RangeSelector':
        rangeSelector = selector;
        break;
    }
  }

  /** @param {Range} range */
  const checkQuote = range => {
    if (quoteSelector?.exact && range.toString() !== quoteSelector.exact) {
      throw new Error('quote mismatch');
    }
  };

  if (rangeSelector) {
    try {
      const range = RangeAnchor.fromSelector(root, rangeSelector).toRange();
      checkQuote(range);
      return range;
    } catch {
      // fall through
    }
  }

  if (positionSelector) {
    try {
      const range = TextPositionAnchor.fromSelector(
        root,
        positionSelector
      ).toRange();
      checkQuote(range);
      return range;
    } catch {
      // fall through
    }
  }

  if (quoteSelector) {
    const options = {};
    if (positionSelector) {
      options.hint = positionSelector.start;
    }
    return TextQuoteAnchor.fromSelector(root, quoteSelector).toRange(options);
  }

  throw new Error('unable to anchor');
}

/**
 * @param {Element} root
 * @param {Range} range
 */
export function describe(root, range) {
  const types = [RangeAnchor, TextPositionAnchor, TextQuoteAnchor];
  const result = [];
  for (let type of types) {
    try {
      const anchor = type.fromRange(root, range);
      result.push(anchor.toSelector());
    } catch (error) {
      continue;
    }
  }
  return result;
}
