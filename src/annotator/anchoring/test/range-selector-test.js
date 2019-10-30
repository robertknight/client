'use strict';

const { fromRange, toRange } = require('../range-selector');

describe('annotator/anchoring/range-selector', () => {
  let content;

  before(() => {
    content = document.createElement('div');
    content.innerHTML = `
<main>
 <article>
   <p>This is paragraph one</p>
   <p>This is paragraph two</p>
 </article>
 <article>
   <p>This is paragraph three</p>
   <p>This is paragraph four</p>
 </article>
</main>
`;
    document.body.appendChild(content);
  });

  after(() => {
    content.remove();
  });

  describe('fromRange', () => {
    [
      {
        startSelector: 'article > p',
        startOffset: 0,
        endSelector: 'article > p:nth-of-type(2)',
        endOffset: 21,
        expected: {
          startContainer: '/main[1]/article[1]/p[1]',
          startOffset: 0,
          endContainer: '/main[1]/article[1]/p[2]',
          endOffset: 21,
        },
      },
    ].forEach(
      ({ startSelector, startOffset, endSelector, endOffset, expected }) => {
        it('returns expected selector', () => {
          const range = document.createRange();
          const start = content.querySelector(startSelector).childNodes[0];
          const end = content.querySelector(endSelector).childNodes[0];
          range.setStart(start, startOffset);
          range.setEnd(end, endOffset);

          const selector = fromRange(content, range);

          assert.deepEqual(selector, expected);
        });
      }
    );

    it('throws if range starts outside of root', () => {
      assert.throws(() => {
        const range = document.createRange();
        range.selectNodeContents(document.body);
        range.setEnd(content, 0);
        fromRange(content, range);
      }, 'Range starts outside of root');
    });

    it('throws if range ends outside of root', () => {
      assert.throws(() => {
        const range = document.createRange();
        range.selectNodeContents(document.body);
        range.setStart(content, 0);
        fromRange(content, range);
      }, 'Range ends outside of root');
    });
  });

  describe('toRange', () => {
    [
      {
        selector: {
          startContainer: '/main[1]/article[1]/p[1]',
          startOffset: 0,
          endContainer: '/main[1]/article[1]/p[2]',
          endOffset: 21,
        },
        expected: 'This is paragraph one This is paragraph two',
      },
    ].forEach(({ selector, expected }) => {
      it('returns a range that refers to the expected text', () => {
        const range = toRange(content, selector);
        assert.ok(range);
        assert.equal(range.toString().replace(/\s+/g, ' '), expected);
      });
    });

    ['/img', '/main[1]/article[4]'].forEach(invalidPath => {
      it('returns `null` if start container is not found', () => {
        const selector = {
          startContainer: invalidPath,
          startOffset: 0,
          endContainer: '/main[1]/article[1]/p[1]',
          endOffset: 5,
        };
        const range = toRange(content, selector);
        assert.equal(range, null);
      });

      it('returns `null` if end container is not found', () => {
        const selector = {
          startContainer: '/main[1]/article[1]/p[1]',
          startOffset: 5,
          endContainer: invalidPath,
          endOffset: 0,
        };
        const range = toRange(content, selector);
        assert.equal(range, null);
      });
    });

    it('returns `null` if start offset is invalid', () => {
      const selector = {
        startContainer: '/main[1]/article[1]/p[1]',
        startOffset: 200,
        endContainer: '/main[1]/article[1]/p[1]',
        endOffset: 0,
      };
      const range = toRange(content, selector);
      assert.equal(range, null);
    });

    it('returns `null` if end offset is invalid', () => {
      const selector = {
        startContainer: '/main[1]/article[1]/p[1]',
        startOffset: 200,
        endContainer: '/main[1]/article[1]/p[1]',
        endOffset: 0,
      };
      const range = toRange(content, selector);
      assert.equal(range, null);
    });
  });
});
