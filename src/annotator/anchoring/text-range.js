/**
 * Return the combined length of text nodes contained in `node`.
 *
 * @param {Node} node
 */
function nodeTextLength(node) {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.TEXT_NODE:
      // nb. `textContent` excludes text in comments and processing instructions
      // when called on a parent element, so we don't need to subtract that here.

      return /** @type {string} */ (node.textContent).length;
    default:
      return 0;
  }
}

/**
 * Return the total length of the text of all previous siblings of `node`.
 *
 * @param {Node} node
 */
function previousSiblingsTextLength(node) {
  let sibling = node.previousSibling;
  let length = 0;
  while (sibling) {
    length += nodeTextLength(sibling);
    sibling = sibling.previousSibling;
  }
  return length;
}

/**
 * Resolve one or more character offsets within an element to (text node, position)
 * pairs.
 *
 * @param {Element} element
 * @param {number[]} offsets - Offsets, which must be sorted in ascending order
 * @param {TextPositionCache} [cache]
 * @return {{ node: Text, offset: number }[]}
 */
function resolveOffsets(element, offsets, cache) {
  if (cache) {
    return offsets.map(off => cache.nodeOffset(off, element));
  }

  let nextOffset = offsets.shift();
  const nodeIter = /** @type {Document} */ (element.ownerDocument).createNodeIterator(
    element,
    NodeFilter.SHOW_TEXT
  );
  const results = [];

  let currentNode = nodeIter.nextNode();
  let textNode;
  let length = 0;

  // Find the text node containing the `nextOffset`th character from the start
  // of `element`.
  while (nextOffset !== undefined && currentNode) {
    textNode = /** @type {Text} */ (currentNode);
    if (length + textNode.data.length > nextOffset) {
      results.push({ node: textNode, offset: nextOffset - length });
      nextOffset = offsets.shift();
    } else {
      currentNode = nodeIter.nextNode();
      length += textNode.data.length;
    }
  }

  // Boundary case.
  while (nextOffset !== undefined && textNode && length === nextOffset) {
    results.push({ node: textNode, offset: textNode.data.length });
    nextOffset = offsets.shift();
  }

  if (nextOffset !== undefined) {
    throw new RangeError('Offset exceeds text length');
  }

  return results;
}

export let RESOLVE_FORWARDS = 1;
export let RESOLVE_BACKWARDS = 2;

/**
 * Represents an offset within the text content of an element.
 *
 * This position can be resolved to a specific descendant node in the current
 * DOM subtree of the element using the `resolve` method.
 */
export class TextPosition {
  /**
   * Construct a `TextPosition` that refers to the text position `offset` within
   * the text content of `element`.
   *
   * @param {Element} element
   * @param {number} offset
   */
  constructor(element, offset) {
    if (offset < 0) {
      throw new Error('Offset is invalid');
    }

    /** Element that `offset` is relative to. */
    this.element = element;

    /** Character offset from the start of the element's `textContent`. */
    this.offset = offset;
  }

  /**
   * Return a copy of this position with offset relative to a given ancestor
   * element.
   *
   * @param {Element} parent - Ancestor of `this.element`
   * @return {TextPosition}
   */
  relativeTo(parent) {
    if (!parent.contains(this.element)) {
      throw new Error('Parent is not an ancestor of current element');
    }

    let el = this.element;
    let offset = this.offset;
    while (el !== parent) {
      offset += previousSiblingsTextLength(el);
      el = /** @type {Element} */ (el.parentElement);
    }

    return new TextPosition(el, offset);
  }

  /**
   * Resolve the position to a specific text node and offset within that node.
   *
   * Throws if `this.offset` exceeds the length of the element's text. In the
   * case where the element has no text and `this.offset` is 0, the `direction`
   * option determines what happens.
   *
   * Offsets at the boundary between two nodes are resolved to the start of the
   * node that begins at the boundary.
   *
   * @param {Object} [options]
   *   @param {RESOLVE_FORWARDS|RESOLVE_BACKWARDS} [options.direction] -
   *     Specifies in which direction to search for the nearest text node if
   *     `this.offset` is `0` and `this.element` has no text. If not specified
   *     an error is thrown.
   *   @param {TextPositionCache} [options.cache] -
   *     Optional cache to speed up the resolution. Has no effect on the output
   *     provided that the document has not changed since the cache was built.
   * @return {{ node: Text, offset: number }}
   * @throws {RangeError}
   */
  resolve(options = {}) {
    try {
      return resolveOffsets(this.element, [this.offset], options.cache)[0];
    } catch (err) {
      if (this.offset === 0 && options.direction !== undefined) {
        const tw = document.createTreeWalker(
          this.element.getRootNode(),
          NodeFilter.SHOW_TEXT
        );
        tw.currentNode = this.element;
        const forwards = options.direction === RESOLVE_FORWARDS;
        const text = /** @type {Text|null} */ (forwards
          ? tw.nextNode()
          : tw.previousNode());
        if (!text) {
          throw err;
        }
        return { node: text, offset: forwards ? 0 : text.data.length };
      } else {
        throw err;
      }
    }
  }

  /**
   * Construct a `TextPosition` that refers to the `offset`th character within
   * `node`.
   *
   * @param {Node} node
   * @param {number} offset
   * @return {TextPosition}
   */
  static fromCharOffset(node, offset) {
    switch (node.nodeType) {
      case Node.TEXT_NODE:
        return TextPosition.fromPoint(node, offset);
      case Node.ELEMENT_NODE:
        return new TextPosition(/** @type {Element} */ (node), offset);
      default:
        throw new Error('Node is not an element or text node');
    }
  }

  /**
   * Construct a `TextPosition` representing the range start or end point (node, offset).
   *
   * @param {Node} node - Text or Element node
   * @param {number} offset - Offset within the node.
   * @return {TextPosition}
   */
  static fromPoint(node, offset) {
    switch (node.nodeType) {
      case Node.TEXT_NODE: {
        if (offset < 0 || offset > /** @type {Text} */ (node).data.length) {
          throw new Error('Text node offset is out of range');
        }

        if (!node.parentElement) {
          throw new Error('Text node has no parent');
        }

        // Get the offset from the start of the parent element.
        const textOffset = previousSiblingsTextLength(node) + offset;

        return new TextPosition(node.parentElement, textOffset);
      }
      case Node.ELEMENT_NODE: {
        if (offset < 0 || offset > node.childNodes.length) {
          throw new Error('Child node offset is out of range');
        }

        // Get the text length before the `offset`th child of element.
        let textOffset = 0;
        for (let i = 0; i < offset; i++) {
          textOffset += nodeTextLength(node.childNodes[i]);
        }

        return new TextPosition(/** @type {Element} */ (node), textOffset);
      }
      default:
        throw new Error('Point is not in an element or text node');
    }
  }
}

/**
 * A cache to optimize mapping between offsets within the text content of
 * an element and positions within the text nodes in that element.
 */
export class TextPositionCache {
  /**
   * Build a cache that maps between positions in `root.textContent` and
   * text node offsets.
   *
   * @param {Element} root
   */
  constructor(root) {
    this.root = root;

    /**
     * @typedef TextOffset
     * @prop {number} start
     * @prop {number} end
     * @prop {Text} node
     */

    /** Cached text content of `root`. */
    this._text = '';

    /**
     * List of text nodes in this element and the offset of their text within
     * the complete text content of the node.
     *
     * @type {TextOffset[]}
     */
    this._textNodes = [];

    /**
     * Mapping between text node and offset in `this._textNodes`
     * @type {Map<Text,number>}
     */
    this._textNodeIndex = new Map();

    const nodeIter = /** @type {Document} */ (root.ownerDocument).createNodeIterator(
      root,
      NodeFilter.SHOW_TEXT
    );
    let current;
    while ((current = nodeIter.nextNode())) {
      const nodeText = /** @type {string} */ (current.nodeValue);
      const nodeData = {
        node: /** @type {Text} */ (current),
        start: this._text.length,
        end: this._text.length + nodeText.length,
      };
      this._textNodes.push(nodeData);
      this._textNodeIndex.set(nodeData.node, this._textNodes.length - 1);
      this._text += nodeText;
    }
  }

  /**
   * Return the cached text content of the root node.
   *
   * This is typically faster than calling `this.root.textContent` which will
   * reconstuct the current text on each call.
   */
  text() {
    return this._text;
  }

  /**
   * Map a position within the cached text to a `Text` node and offset.
   *
   * Positions at the boundary between nodes are mapped to the node beginning
   * at the position.
   *
   * @param {number} pos
   * @param {Element} [element] -
   *   Element which `pos` is relative to. Defaults to `this.root`.
   * @return {{ node: Text, offset: number }}
   */
  nodeOffset(pos, element) {
    if (this._textNodes.length === 0) {
      throw new Error('No text nodes in range');
    }

    if (element && element !== this.root) {
      const nodeIter = /** @type {Document} */ (element.ownerDocument).createNodeIterator(
        element,
        NodeFilter.SHOW_TEXT
      );
      const firstText = /** @type {Text|null} */ (nodeIter.nextNode());
      if (!firstText) {
        throw new RangeError('Offset exceeds text length');
      }
      pos += this.toPosition(firstText, 0);
    }

    const len = this._textNodes.length;
    const lastNode = this._textNodes[len - 1];

    if (pos < 0 || len === 0 || pos > lastNode.end) {
      throw new RangeError('Position is out of range');
    }

    // Boundary case.
    if (pos === lastNode.end) {
      return { node: lastNode.node, offset: pos - lastNode.start };
    }

    let low = 0;
    let high = len;

    while (low < high) {
      const middle = Math.floor((low + high) / 2);

      const node = this._textNodes[middle];
      if (pos >= node.start && pos < node.end) {
        return { node: node.node, offset: pos - node.start };
      }

      if (pos >= node.start) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    throw new Error('Text node not found');
  }

  /**
   * Convert an offset within a text node under `this.root` to a position relative
   * to `this.root.textContent`.
   *
   * @param {Text} node
   * @param {number} offset
   * @return {number}
   */
  toPosition(node, offset) {
    const index = this._textNodeIndex.get(node);
    if (index === undefined) {
      throw new Error('No such text node');
    }
    const nodeData = this._textNodes[index];
    if (offset < 0 || offset > nodeData.end - nodeData.start) {
      throw new RangeError('Offset is out of range');
    }
    return nodeData.start + offset;
  }
}

/**
 * Represents a region of a document as a (start, end) pair of `TextPosition` points.
 *
 * Representing a range in this way allows for changes in the DOM content of the
 * range which don't affect its text content, without affecting the text content
 * of the range itself.
 */
export class TextRange {
  /**
   * Construct an immutable `TextRange` from a `start` and `end` point.
   *
   * @param {TextPosition} start
   * @param {TextPosition} end
   */
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  /**
   * Return a copy of this range with start and end positions relative to a
   * given ancestor. See `TextPosition.relativeTo`.
   *
   * @param {Element} element
   */
  relativeTo(element) {
    return new TextRange(
      this.start.relativeTo(element),
      this.end.relativeTo(element)
    );
  }

  /**
   * Resolve the `TextRange` to a DOM range.
   *
   * The resulting DOM Range will always start and end in a `Text` node.
   * Hence `TextRange.fromRange(range).toRange()` can be used to "shrink" a
   * range to the text it contains.
   *
   * May throw if the `start` or `end` positions cannot be resolved to a range.
   *
   * @param {TextPositionCache} [cache] -
   *   Optional cache to speed up the resolution. Has no effect on the output
   *   provided that the document has not changed since the cache was built.
   * @return {Range}
   */
  toRange(cache) {
    let start;
    let end;

    if (
      this.start.element === this.end.element &&
      this.start.offset <= this.end.offset
    ) {
      // Fast path for start and end points in same element.
      [start, end] = resolveOffsets(
        this.start.element,
        [this.start.offset, this.end.offset],
        cache
      );
    } else {
      start = this.start.resolve({ cache, direction: RESOLVE_FORWARDS });
      end = this.end.resolve({ cache, direction: RESOLVE_BACKWARDS });
    }

    const range = new Range();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  }

  /**
   * Convert an existing DOM `Range` to a `TextRange`
   *
   * @param {Range} range
   * @return {TextRange}
   */
  static fromRange(range) {
    const start = TextPosition.fromPoint(
      range.startContainer,
      range.startOffset
    );
    const end = TextPosition.fromPoint(range.endContainer, range.endOffset);
    return new TextRange(start, end);
  }

  /**
   * Return a `TextRange` from the `start`th to `end`th characters in `root`.
   *
   * @param {Element} root
   * @param {number} start
   * @param {number} end
   */
  static fromOffsets(root, start, end) {
    return new TextRange(
      new TextPosition(root, start),
      new TextPosition(root, end)
    );
  }
}
