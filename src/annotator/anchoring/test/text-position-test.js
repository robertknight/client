'use strict';

const { fromRange, toRange } = require('../text-position');

describe('text-position', () => {
  let container;
  let trailer;

  before(() => {
    container = document.createElement('div');
    container.className = 'text-position-test';
    container.innerHTML = `<h1>Test article</h1>
<p>First paragraph.</p>
<p>Second paragraph.</p>`;

    trailer = document.createElement('div');
    trailer.className = 'text-position-trailer';
    trailer.innerHTML = 'content after container';

    document.body.appendChild(container);
    document.body.appendChild(trailer);
  });

  after(() => {
    container.remove();
    trailer.remove();
  });

  describe('fromRange', () => {
    [
      {
        description: 'range at beginning of root',
        start: ['.text-position-test > h1', 0],
        end: ['.text-position-test > h1', 4],
        expected: [0, 4],
      },

      {
        description: 'range starting before root and ending within it',
        start: ['body', null],
        end: ['.text-position-test > h1', 4],
        expected: [0, 4],
      },

      {
        description: 'range starting and ending in the middle of a text node',
        start: ['.text-position-test > h1', 5],
        end: ['.text-position-test > h1', 8],
        expected: [5, 8],
      },

      {
        description: 'range starting at an element boundary',
        start: ['.text-position-test > p', null],
        end: ['.text-position-test > p', 5],
        expected: [13, 18],
      },

      {
        description: 'range ending at an element boundary',
        start: ['.text-position-test > h1', 5],
        end: ['.text-position-test > p', null],
        expected: [5, 13],
      },

      {
        description: 'range ending after root',
        start: ['.text-position-test > h1', 5],
        end: ['.text-position-trailer', null],
        expected: [5, 47],
      },

      {
        description: 'range starting and ending before root',
        start: ['body', null],
        end: ['body', null],
        expected: [0, 0],
      },

      {
        description: 'range starting and ending after root',
        start: ['.text-position-trailer', null],
        end: ['.text-position-trailer', null],
        expected: [47, 47],
      },
    ].forEach(({ description, start, end, expected }) => {
      it(`returns correct \`start\` and \`end\` offsets (${description})`, () => {
        const root = container;
        const range = container.ownerDocument.createRange();
        const [startElement, startOffset] = start;
        const [endElement, endOffset] = end;

        let startContainer = document.querySelector(startElement);
        if (typeof startOffset === 'number') {
          startContainer = startContainer.childNodes[0];
        }

        let endContainer = document.querySelector(endElement);
        if (typeof endOffset === 'number') {
          endContainer = endContainer.childNodes[0];
        }

        range.setStart(startContainer, startOffset);
        range.setEnd(endContainer, endOffset);

        const actual = fromRange(root, range);
        assert.deepEqual(actual, expected);
      });
    });
  });

  describe('toRange', () => {
    const testCase = (description, text) => ({
      description,
      text,
      expected: text,
    });

    [
      testCase('start text of root', 'Test article'),
      testCase('a whole text node', 'First paragraph.'),
      testCase('end text of root', 'Second paragraph.'),
      testCase('part of a text node', 'rst paragraph'),
      {
        description: 'negative start offset',
        start: -5,
        end: 5,
        expected: new Error('invalid start offset'),
      },
      {
        description: 'invalid start offset',
        start: 1000,
        end: 1010,
        expected: new Error('invalid start offset'),
      },
      {
        description: 'invalid end offset',
        start: 0,
        end: 1000,
        expected: new Error('invalid end offset'),
      },
      {
        description: 'an empty range',
        start: 0,
        end: 0,
        expected: '',
      },
      {
        description: 'a range with end < start',
        start: 10,
        end: 5,
        expected: '',
      },
    ].forEach(({ description, start, end, expected, text }) => {
      it(`returns a range with the correct text (${description})`, () => {
        if (text) {
          start = container.textContent.indexOf(text);
          end = start + text.length;
        }

        if (expected instanceof Error) {
          assert.throws(() => {
            toRange(container, start, end);
          }, expected.message);
        } else {
          const range = toRange(container, start, end);
          assert.equal(range.toString(), expected);
        }
      });
    });
  });
});
