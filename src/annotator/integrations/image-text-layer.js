import debounce from 'lodash.debounce';
import TinyQueue from 'tinyqueue';

import { ListenerCollection } from '../../shared/listener-collection';
import {
  manhattanDist,
  rectCenter,
  rectContains,
  rectIsEmpty,
  rectsOverlapVertically,
  unionRects,
} from '../util/geometry';

/**
 * @typedef WordBox
 * @prop {string} text
 * @prop {DOMRect} rect - Bounding rectangle of all glyphs in word
 */

/**
 * @typedef LineBox
 * @prop {WordBox[]} words
 * @prop {DOMRect} rect - Bounding rectangle of all words in line
 */

/**
 * @typedef ColumnBox
 * @prop {LineBox[]} lines
 * @prop {DOMRect} rect - Bounding rectangle of all lines in column
 */

/**
 * Shuffle an array in-place.
 *
 * @template T
 * @param {T[]} array
 */
function shuffle(array) {
  // See https://en.wikipedia.org/wiki/Fisher–Yates_shuffle#The_modern_algorithm
  for (let i = array.length - 1; i >= 1; i--) {
    const k = Math.round(Math.random() * i);
    const temp = array[i];
    array[i] = array[k];
    array[k] = temp;
  }
  return array;
}

/**
 * Group character boxes into words.
 *
 * @param {DOMRect[]} charBoxes
 * @param {string} text
 */
function findWords(charBoxes, text) {
  /** @type {WordBox[]} */
  const words = [];

  /** @type {WordBox} */
  let currentWord = { text: '', rect: new DOMRect() };

  // Group characters into words.
  const addWord = () => {
    if (currentWord.text.length > 0) {
      words.push(currentWord);
      currentWord = { text: '', rect: new DOMRect() };
    }
  };
  for (let [i, rect] of charBoxes.entries()) {
    const char = text[i];
    const isSpace = /\s/.test(char);

    currentWord.rect = unionRects(currentWord.rect, rect);

    // To simplify downstream logic, normalize whitespace.
    currentWord.text += isSpace ? ' ' : char;

    if (isSpace) {
      addWord();
    }
  }
  addWord();

  return words;
}

/**
 * Sort columns of text on the page into reading order.
 *
 * @param {ColumnBox[]} columns
 */
function sortColumns(columns) {
  return columns.sort((a, b) => {
    // Sort rects top-to-bottom and then left-to-right.
    if (!rectsOverlapVertically(a.rect, b.rect)) {
      return a.rect.top - b.rect.top;
    }
    return a.rect.left - b.rect.left;
  });
}

/**
 * @param {DOMRect[]} rects
 */
function unionRectList(rects) {
  return rects.reduce((result, r) => unionRects(result, r), new DOMRect());
}

/**
 * Find the largest empty rectangles in `rect` that do not intersect `items`,
 * sorted in descending order of area.
 *
 * The implementation is based on a branch-and-bound algorithm from [1].
 *
 * [1] Breuel, T.M. (2002). Two Geometric Algorithms for Layout Analysis. Document Analysis Systems.
 *
 * @param {DOMRect} container
 * @param {DOMRect[]} items
 * @param {number} minWidth
 * @param {number} minHeight
 * @return {DOMRect[]}
 */
function findEmptyRects(container, items, minWidth, minHeight) {
  if (rectIsEmpty(container)) {
    return [];
  }

  /** @param {DOMRect} rect */
  const area = rect => rect.width * rect.height;

  // Priority queue of candidates for being empty rects, sorted in decreasing
  // order of area.
  //
  // The algorithm works with _score functions_ other than the area, as long
  // as when a candidate is subdivided, the subdivisions have a lower score than
  // the current candidate.
  const candidateQueue = new TinyQueue(
    [container],
    (a, b) => area(b) - area(a)
  );

  /** @param {DOMRect} rect */
  const maybeEnqueue = rect => {
    if (rect.width >= minWidth && rect.height >= minHeight) {
      candidateQueue.push(rect);
    }
  };

  const emptyRects = [];
  while (candidateQueue.length > 0) {
    const rect = candidateQueue.pop();
    if (!rect) {
      break;
    }

    // TODO - Make this more efficient. If `items` was sorted by top y
    // coordinate a binary search could be used.
    const rectItems = items.filter(item => rectContains(rect, item));

    if (rectItems.length === 0) {
      emptyRects.push(rect);
    } else {
      // Choose the item nearest the center of the current rect as a pivot.
      const centerPos = rectCenter(rect);
      let pivotDist = Infinity;
      let pivot = rectItems[0];
      for (let item of rectItems) {
        const itemDist = manhattanDist(centerPos, rectCenter(item));
        if (itemDist < pivotDist) {
          pivot = item;
          pivotDist = itemDist;
        }
      }

      // Add the spaces above, below, and to the left and right of the pivot
      // as candidates for being empty rectangles.
      const rectAbove = new DOMRect(
        rect.left,
        rect.top,
        rect.width,
        pivot.y - rect.top
      );
      maybeEnqueue(rectAbove);

      const rectLeft = new DOMRect(
        rect.left,
        rect.top,
        pivot.x - rect.left,
        rect.height
      );
      maybeEnqueue(rectLeft);

      const rectBelow = new DOMRect(
        rect.left,
        pivot.bottom,
        rect.width,
        rect.bottom - pivot.bottom
      );
      maybeEnqueue(rectBelow);

      const rectRight = new DOMRect(
        pivot.right,
        rect.top,
        rect.right - pivot.right,
        rect.height
      );
      maybeEnqueue(rectRight);
    }
  }

  return emptyRects;
}

/**
 * Group characters in a page into words, lines and columns.
 *
 * The input is assumed to be _roughly_ reading order, more so at the low (word,
 * line) level. When the input is not in reading order, the output may be
 * divided into more lines / columns than expected. Downstream code is expected
 * to tolerate over-segmentation. This function should try to avoid producing
 * lines or columns that significantly intersect, as this can impair text
 * selection.
 *
 * @param {DOMRect[]} charBoxes - Bounding rectangle associated with each character on the page
 * @param {string} text - Text that corresponds to `charBoxes`
 * @return {ColumnBox[]}
 */
function analyzeLayout(charBoxes, text) {
  const words = findWords(charBoxes, text);

  // Shuffle words in to ensure that the rest of the logic doesn't depend on
  // the input order.
  shuffle(words);

  // Find empty areas which separate sections of the page.
  const wordRects = words.map(w => w.rect);

  // Thresholds for the minimum size that a candidate rectangle must have to
  // be returned.
  const minWidth =
    (wordRects.reduce((sum, r) => sum + r.width, 0) / wordRects.length) * 4;
  const minHeight =
    (wordRects.reduce((sum, r) => sum + r.height, 0) / wordRects.length) * 4;

  const boundingRect = unionRectList(wordRects);

  // TODO - Visualize whitespace rects and content rects.
  const whitespaceRects = findEmptyRects(
    boundingRect,
    wordRects,
    minWidth,
    minHeight
  );

  // Find non-empty areas. These define the "columns" on the page.
  const columnRects = findEmptyRects(
    boundingRect,
    whitespaceRects,
    0 /* minWidth */,
    0 /* minHeight */
  );

  // TODO - Handle overlap between areas.

  columnRects.sort((a, b) => a.top - b.top);

  // Group the words in each column into lines.
  const columns = columnRects
    .map(rect => {
      const rectWords = words
        .filter(w => rectContains(rect, w.rect))
        .sort((a, b) => rectCenter(a.rect).y - rectCenter(b.rect).y);
      if (rectWords.length === 0) {
        return null;
      }

      const lines = [];
      while (rectWords.length > 0) {
        const firstWord = /** @type {WordBox} */ (rectWords.pop());
        const lineWords = [firstWord];
        while (
          rectWords.length > 0 &&
          rectsOverlapVertically(firstWord.rect, rectWords[0].rect)
        ) {
          lineWords.push(/** @type {WordBox} */ (rectWords.pop()));
        }
        const lineRect = lineWords.reduce(
          (result, word) => unionRects(result, word.rect),
          new DOMRect()
        );

        lineWords.sort((a, b) => a.rect.left - b.rect.left);

        lines.push(
          /** @type {LineBox} */ ({ words: lineWords, rect: lineRect })
        );
      }

      return /** @type {ColumnBox} */ ({ lines, rect });
    })
    .filter(
      /** @return {col is ColumnBox} */
      col => col !== null
    );

  const sortedColumns = sortColumns(columns);

  return sortedColumns;
}

/**
 * ImageTextLayer maintains a transparent text layer on top of an image
 * which contains text. This enables the text in the image to be selected
 * and highlighted.
 *
 * This is similar to the one that PDF.js creates for us in our standard PDF
 * viewer.
 */
export class ImageTextLayer {
  /**
   * Create a text layer which is displayed on top of `image`.
   *
   * @param {Element} image - Rendered image on which to overlay the text layer.
   *   The text layer will be inserted into the DOM as the next sibling of `image`.
   * @param {DOMRect[]} charBoxes - Bounding boxes for characters in the image.
   *   Coordinates should be in the range [0-1], where 0 is the top/left corner
   *   of the image and 1 is the bottom/right.
   * @param {string} text - Characters in the image corresponding to `charBoxes`
   */
  constructor(image, charBoxes, text) {
    if (charBoxes.length !== text.length) {
      throw new Error('Char boxes length does not match text length');
    }

    // Create container for text layer and position it above the image.
    const containerParent = /** @type {HTMLElement} */ (image.parentNode);
    const container = document.createElement('hypothesis-text-layer');
    containerParent.insertBefore(container, image.nextSibling);

    // Position text layer over image. We assume the image's top-left corner
    // aligns with the top-left corner of its container.
    containerParent.style.position = 'relative';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.color = 'transparent';

    // Prevent inherited text alignment from affecting positioning.
    // VitalSource sets `text-align: center` for example.
    container.style.textAlign = 'left';

    // Use multiply blending to make text in the image more readable when
    // the corresponding text in the text layer is selected or highlighted.
    // We apply a similar effect in PDF.js.
    container.style.mixBlendMode = 'multiply';

    // Set a fixed font style on the container and create a canvas using the same
    // font which we can use to measure the "natural" size of the text. This is
    // later used when scaling the text to fit the underlying part of the image.
    const fontSize = 16;
    const fontFamily = 'sans-serif';
    container.style.fontSize = fontSize + 'px';
    container.style.fontFamily = fontFamily;
    const canvas = document.createElement('canvas');
    const context = /** @type {CanvasRenderingContext2D} */ (
      canvas.getContext('2d')
    );
    context.font = `${fontSize}px ${fontFamily}`;

    /**
     * Generate a CSS value that scales with the `--x-scale` or `--y-scale` CSS variables.
     *
     * @param {'x'|'y'} dimension
     * @param {number} value
     * @param {string} unit
     */
    const scaledValue = (dimension, value, unit = 'px') =>
      `calc(var(--${dimension}-scale) * ${value}${unit})`;

    // Group characters into words, lines and columns. Then use the result to
    // create a hierarchical DOM structure in the text layer:
    //
    // 1. Columns are positioned absolutely
    // 2. Columns stack lines vertically using a block layout
    // 3. Lines arrange words horizontally using an inline layout
    //
    // This allows the browser to select the expected text when the cursor is
    // in-between lines or words.
    const columns = analyzeLayout(charBoxes, text);

    for (let column of columns) {
      const columnEl = document.createElement('hypothesis-text-column');
      columnEl.style.display = 'block';
      columnEl.style.position = 'absolute';
      columnEl.style.left = scaledValue('x', column.rect.left);
      columnEl.style.top = scaledValue('y', column.rect.top);

      let prevLine = null;
      for (let line of column.lines) {
        const lineEl = document.createElement('hypothesis-text-line');
        lineEl.style.display = 'block';
        lineEl.style.marginLeft = scaledValue(
          'x',
          line.rect.left - column.rect.left
        );
        lineEl.style.height = scaledValue('y', line.rect.height);

        if (prevLine) {
          lineEl.style.marginTop = scaledValue(
            'y',
            line.rect.top - prevLine.rect.bottom
          );
        }
        prevLine = line;

        // Prevent line breaks if the word elements don't quite fit the line.
        lineEl.style.whiteSpace = 'nowrap';

        let prevWord = null;
        for (let word of line.words) {
          const wordEl = document.createElement('hypothesis-text-word');
          wordEl.style.display = 'inline-block';
          wordEl.style.transformOrigin = 'top left';
          wordEl.textContent = word.text;

          if (prevWord) {
            wordEl.style.marginLeft = scaledValue(
              'x',
              word.rect.left - prevWord.rect.right
            );
          }
          prevWord = word;

          // Set the size of this box used for layout. This does not affect the
          // rendered size of the content.
          wordEl.style.width = scaledValue('x', word.rect.width);
          wordEl.style.height = scaledValue('y', word.rect.height);

          // Don't collapse whitespace at end of words, so it remains visible
          // in selected text. Also prevent line breaks due to overflows.
          wordEl.style.whiteSpace = 'pre';

          // Scale content using a transform. This affects the rendered size
          // of the text, used by text selection and
          // `Element.getBoundingClientRect`, but not layout.
          const metrics = context.measureText(word.text);
          const xScale = scaledValue('x', word.rect.width / metrics.width, '');
          const yScale = scaledValue('y', word.rect.height / fontSize, '');
          wordEl.style.transform = `scale(${xScale}, ${yScale})`;

          lineEl.append(wordEl);
        }

        columnEl.append(lineEl);
      }

      container.append(columnEl);
    }

    const updateTextLayerSize = () => {
      const { width: imageWidth, height: imageHeight } =
        image.getBoundingClientRect();
      container.style.width = imageWidth + 'px';
      container.style.height = imageHeight + 'px';

      container.style.setProperty('--x-scale', `${imageWidth}`);
      container.style.setProperty('--y-scale', `${imageHeight}`);
    };

    updateTextLayerSize();

    /**
     * Container element for the text layer.
     *
     * This is exposed so that callers can tweak the style if needed (eg.
     * to set a z-index value).
     */
    this.container = container;

    this._updateTextLayerSize = debounce(updateTextLayerSize, { maxWait: 50 });
    this._listeners = new ListenerCollection();

    if (typeof ResizeObserver !== 'undefined') {
      this._imageSizeObserver = new ResizeObserver(() => {
        this._updateTextLayerSize();
      });
      this._imageSizeObserver.observe(image);
    }

    // Fallback for browsers that don't support ResizeObserver (Safari < 13.4).
    // Due to the debouncing, we can register this listener in all browsers for
    // simplicity, without downsides.
    this._listeners.add(window, 'resize', this._updateTextLayerSize);
  }

  /**
   * Synchronously update the text layer to match the size and position of
   * the image.
   *
   * Normally the text layer is resized automatically but asynchronously when
   * the image size changes (eg. due to the window being resized) and updates
   * are debounced. This method can be used to force an immediate update if
   * needed.
   */
  updateSync() {
    this._updateTextLayerSize();
    this._updateTextLayerSize.flush();
  }

  destroy() {
    this.container.remove();
    this._listeners.removeAll();
    this._updateTextLayerSize.cancel();
    this._imageSizeObserver?.disconnect();
  }
}
