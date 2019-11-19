'use strict';

/* global PDFViewerApplication */

const RenderingStates = require('../pdfjs-rendering-states');
const { TextQuoteAnchor } = require('./types');
const {
  fromRange: textPositionFromRange,
  toRange: textPositionToRange,
  textNodeIterator,
} = require('./text-position');
const { isNodeInRange } = require('../range-util');

/**
 * @typedef {TextRange}
 * @prop {number} start
 * @prop {number} end
 */

// Caches for performance.

/**
 * Map of page index to page text content as a `Promise<string>`.
 */
let pageTextCache = {};

/**
 * 2D map from `[quote][position]` to `{pageIndex, anchor}` intended to optimize
 * re-anchoring of a pair of quote and position selectors if the position
 * selector fails to anchor on its own.
 */
let quotePositionCache = {};

function getSiblingIndex(node) {
  return Array.from(node.parentNode.childNodes).indexOf(node);
}

/**
 * Returns the view into which a PDF page is drawn.
 *
 * If called while the PDF document is still loading, this will delay until
 * the document loading has progressed far enough for a `PDFPageView` and its
 * associated `PDFPage` to be ready.
 *
 * @param {number} pageIndex
 * @return {Promise<PDFPageView>}
 */
async function getPageView(pageIndex) {
  const pdfViewer = PDFViewerApplication.pdfViewer;
  let pageView = pdfViewer.getPageView(pageIndex);

  if (!pageView || !pageView.pdfPage) {
    // If the document is still loading, wait for the `pagesloaded` event.
    //
    // Note that loading happens in several stages. Initially the page view
    // objects do not exist (`pageView` will be nullish), then after the
    // "pagesinit" event, the page view exists but it does not have a `pdfPage`
    // property set, then finally after the "pagesloaded" event, it will have
    // a "pdfPage" property.
    pageView = await new Promise(resolve => {
      const onPagesLoaded = () => {
        document.removeEventListener('pagesloaded', onPagesLoaded);
        resolve(pdfViewer.getPageView(pageIndex));
      };
      document.addEventListener('pagesloaded', onPagesLoaded);
    });
  }

  return pageView;
}

/**
 * Return the text of a given PDF page.
 *
 * @param {number} pageIndex
 * @return {Promise<string>}
 */
async function getPageTextContent(pageIndex) {
  if (pageTextCache[pageIndex]) {
    return pageTextCache[pageIndex];
  }

  // Join together PDF.js `TextItem`s representing pieces of text in a PDF page.
  const joinItems = items => {
    // Skip empty items since PDF.js leaves their text layer divs blank.
    // Excluding them makes our measurements match the rendered text layer.
    // Otherwise, the selectors we generate would not match this stored text.
    // See the `appendText` method of `TextLayerBuilder` in PDF.js.
    const nonEmpty = items
      .filter(item => /\S/.test(item.str))
      .map(item => item.str);
    const textContent = nonEmpty.join('');
    return textContent;
  };

  // Fetch the text content for a given page as a string.
  const getTextContent = async pageIndex => {
    const pageView = await getPageView(pageIndex);
    const textContent = await pageView.pdfPage.getTextContent({
      normalizeWhitespace: true,
    });
    return joinItems(textContent.items);
  };

  pageTextCache[pageIndex] = getTextContent(pageIndex);

  return pageTextCache[pageIndex];
}

/**
 * Return the offset in the text for the whole document at which the text for
 * `pageIndex` begins.
 *
 * @param {number} pageIndex
 * @return {Promise<number>} - Character position at which page text starts
 */
function getPageOffset(pageIndex) {
  let index = -1;

  const next = offset => {
    ++index;
    if (index === pageIndex) {
      return Promise.resolve(offset);
    }

    return getPageTextContent(index).then(textContent =>
      next(offset + textContent.length)
    );
  };

  return next(0);
}

/**
 * Information about the page where a particular character position in the
 * text of the document occurs.
 *
 * @typedef PageOffset
 * @prop {number} index - Index of page containing offset
 * @prop {number} offset -
 *  Character position of the start of `textContent`
 *  within the full text of the document
 * @prop {string} textContent - Full text of page containing offset
 */

/**
 * Find the index and text content of a page containing the character position
 * `offset` within the complete text of the document.
 *
 * @param {number} offset
 * @return {PageOffset}
 */
function findPage(offset) {
  let index = 0;
  let total = 0;

  // We call `count` once for each page, in order. The passed offset is found on
  // the first page where the cumulative length of the text content exceeds the
  // offset value.
  //
  // When we find the page the offset is on, we return an object containing the
  // page index, the offset at the start of that page, and the textContent of
  // that page.
  //
  // To understand this a little better, here's a worked example. Imagine a
  // document with the following page lengths:
  //
  //    Page 0 has length 100
  //    Page 1 has length 50
  //    Page 2 has length 50
  //
  // Then here are the pages that various offsets are found on:
  //
  //    offset | index
  //    --------------
  //    0      | 0
  //    99     | 0
  //    100    | 1
  //    101    | 1
  //    149    | 1
  //    150    | 2
  const count = textContent => {
    const lastPageIndex = PDFViewerApplication.pdfViewer.pagesCount - 1;
    if (total + textContent.length > offset || index === lastPageIndex) {
      // Offset is in current page.
      offset = total;
      return Promise.resolve({ index, offset, textContent });
    } else {
      // Offset is within a subsequent page.
      ++index;
      total += textContent.length;
      return getPageTextContent(index).then(count);
    }
  };

  return getPageTextContent(0).then(count);
}

/**
 * Locate the DOM Range which a position selector refers to.
 *
 * If the page is off-screen it may be in an unrendered state, in which case
 * the text layer will not have been created. In that case a placeholder
 * DOM element is created and the returned range refers to that placeholder.
 * In that case, the selector will need to be re-anchored when the page is
 * scrolled into view.
 *
 * @param {number} pageIndex - The PDF page index
 * @param {TextRange} anchor - Anchor to locate in page
 * @return {Promise<Range>}
 */
async function anchorByPosition(pageIndex, anchor) {
  const page = await getPageView(pageIndex);

  let renderingDone = false;
  if (page.textLayer) {
    renderingDone = page.textLayer.renderingDone;
  }
  if (page.renderingState === RenderingStates.FINISHED && renderingDone) {
    // The page has been rendered. Locate the position in the text layer.
    const root = page.textLayer.textLayerDiv;
    return textPositionToRange(root, anchor.start, anchor.end);
  }

  // The page has not been rendered yet. Create a placeholder element and
  // anchor to that instead.
  const div = page.div || page.el;
  let placeholder = div.getElementsByClassName('annotator-placeholder')[0];
  if (!placeholder) {
    placeholder = document.createElement('span');
    placeholder.classList.add('annotator-placeholder');
    placeholder.textContent = 'Loading annotations…';
    div.appendChild(placeholder);
  }
  const range = document.createRange();
  range.setStartBefore(placeholder);
  range.setEndAfter(placeholder);
  return range;
}

/**
 * Search for a quote in the given pages.
 *
 * @param {number[]} pageIndexes - Pages to search in priority order
 * @param {TextQuoteSelector} quoteSelector
 * @param {Object} positionHint - Options to pass to `TextQuoteAnchor#toPositionAnchor`
 * @return {Promise<Range>} Location of quote
 */
function findInPages(pageIndexes, quoteSelector, positionHint) {
  if (pageIndexes.length === 0) {
    // We reached the end of the document without finding a match for the quote.
    return Promise.reject(new Error('Quote not found'));
  }

  const [pageIndex, ...rest] = pageIndexes;

  const content = getPageTextContent(pageIndex);
  const offset = getPageOffset(pageIndex);

  const attempt = ([content, offset]) => {
    const root = { textContent: content };
    const anchor = TextQuoteAnchor.fromSelector(root, quoteSelector);
    if (positionHint) {
      let hint = positionHint.start - offset;
      hint = Math.max(0, hint);
      hint = Math.min(hint, content.length);
      return anchor.toPositionAnchor({ hint });
    }
    return anchor.toPositionAnchor();
  };

  const next = () => findInPages(rest, quoteSelector, positionHint);

  const cacheAndFinish = anchor => {
    if (positionHint) {
      if (!quotePositionCache[quoteSelector.exact]) {
        quotePositionCache[quoteSelector.exact] = {};
      }
      quotePositionCache[quoteSelector.exact][positionHint.start] = {
        pageIndex,
        anchor,
      };
    }
    return anchorByPosition(pageIndex, anchor);
  };

  // First, get the text offset and other details of the current page.
  return (
    Promise.all([content, offset])
      // Attempt to locate the quote in the current page.
      .then(attempt)
      // If the quote is located, find the DOM range and return it.
      .then(cacheAndFinish)
      // If the quote was not found, try the next page.
      .catch(next)
  );
}

/**
 * Return a list of page indexes to search for a quote in priority order.
 *
 * When a position anchor is available, quote search can be optimized by
 * searching pages nearest the expected position first.
 *
 * @param {TextRange} position
 * @return {number[]}
 */
function prioritizePages(position) {
  const pageCount = PDFViewerApplication.pdfViewer.pagesCount;
  const pageIndices = Array(pageCount)
    .fill(0)
    .map((_, i) => i);

  if (!position) {
    return Promise.resolve(pageIndices);
  }

  // Sort page indexes by offset from `pageIndex`.
  function sortPages(pageIndex) {
    const left = pageIndices.slice(0, pageIndex);
    const right = pageIndices.slice(pageIndex);
    const result = [];
    while (left.length > 0 || right.length > 0) {
      if (right.length) {
        result.push(right.shift());
      }
      if (left.length) {
        result.push(left.pop());
      }
    }
    return result;
  }

  return findPage(position.start).then(({ index }) => sortPages(index));
}

/**
 * Anchor a set of selectors to a DOM Range.
 *
 * @param {HTMLElement} root
 * @param {Array} selectors - Selector objects to anchor
 * @return {Promise<Range>}
 */
function anchor(root, selectors) {
  const position = selectors.find(s => s.type === 'TextPositionSelector');
  const quote = selectors.find(s => s.type === 'TextQuoteSelector');

  let result = Promise.reject('unable to anchor');

  const checkQuote = range => {
    if (quote && quote.exact !== range.toString()) {
      throw new Error('quote mismatch');
    }
    return range;
  };

  if (position) {
    result = result.catch(() => {
      return findPage(position.start).then(({ index, offset, textContent }) => {
        const start = position.start - offset;
        const end = position.end - offset;
        const length = end - start;

        checkQuote(textContent.substr(start, length));

        return anchorByPosition(index, { start, end });
      });
    });
  }

  if (quote) {
    result = result.catch(() => {
      if (
        position &&
        quotePositionCache[quote.exact] &&
        quotePositionCache[quote.exact][position.start]
      ) {
        const { pageIndex, anchor } = quotePositionCache[quote.exact][
          position.start
        ];
        return anchorByPosition(pageIndex, anchor);
      }

      return prioritizePages(position).then(pageIndices => {
        return findInPages(pageIndices, quote, position);
      });
    });
  }

  return result;
}

/**
 * Return a list of DOM nodes representing the PDF page text layers spanned
 * by `range`.
 *
 * There will be one DOM node for each PDF page whose text is partly or wholly
 * included in `range`.
 *
 * @param {Range}
 * @return {HTMLElement[]}
 */
function getTextLayers(range) {
  const textLayers = [];
  const nodeIter = textNodeIterator(range.commonAncestorContainer);

  let node;
  while ((node = nodeIter.nextNode())) {
    if (!isNodeInRange(range, node)) {
      continue;
    }

    // We know that `node` is a text node here and therefore its parent is an
    // element.
    let ancestor = node.parentNode;
    while (ancestor && !ancestor.classList.contains('textLayer')) {
      // Parent may be an element or document, we are only interested in
      // elements.
      ancestor = ancestor.parentElement;
    }

    const textLayer = ancestor;
    if (textLayer && textLayers.indexOf(textLayer) === -1) {
      textLayers.push(textLayer);
    }
  }

  return textLayers;
}

/**
 * Convert a DOM Range object into a set of selectors.
 *
 * Converts a DOM `Range` object into a `[position, quote]` tuple of selectors
 * which can be saved with an annotation and later passed to `anchor` to
 * convert the selectors back to a `Range`.
 *
 * @param {HTMLElement} root - The root element
 * @param {Range} range
 * @param {Object} options -
 *   Options passed to `TextQuoteAnchor`'s `toSelector` method.
 * @return {Promise<[TextPositionSelector, TextQuoteSelector]>}
 */
async function describe(root, range, options = {}) {
  const textLayers = getTextLayers(range);

  if (textLayers.length === 0) {
    throw new Error('no text is selected');
  }

  if (textLayers.length > 1) {
    throw new Error('selecting across page breaks is not supported');
  }

  const startTextLayer = textLayers[0];
  const startPageIndex = getSiblingIndex(startTextLayer.parentNode);

  const pageOffset = await getPageOffset(startPageIndex);

  // Get the offset within the text layer where the selection occurs.
  let [startPos, endPos] = textPositionFromRange(startTextLayer, range);

  // Get a range which is cropped to the text layer, i.e. it excludes any text
  // outside of it that the user may have selected.
  const quoteRange = textPositionToRange(startTextLayer, startPos, endPos);

  // Adjust the start and end offsets to refer to the whole document,
  // not just the current page.
  startPos += pageOffset;
  endPos += pageOffset;

  const position = {
    type: 'TextPositionSelector',
    start: startPos,
    end: endPos,
  };

  const quote = TextQuoteAnchor.fromRange(
    startTextLayer,
    quoteRange,
    options
  ).toSelector(options);

  return [position, quote];
}

/**
 * Clear this module's internal caches.
 *
 * This exists mainly as a helper for use in tests.
 */
function purgeCache() {
  pageTextCache = {};
  quotePositionCache = {};
}

module.exports = {
  anchor,
  describe,
  purgeCache,
};
