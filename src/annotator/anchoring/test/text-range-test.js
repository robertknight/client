import { TextPosition, TextRange } from '../text-range';

const html = `
<main>
  <article>
    <p>This is <b>a</b> <ignore-me>test <ignore-me>paragraph</ignore-me></ignore-me>.</p>
    <!-- Comment in middle of HTML -->
    <pre>Some content</pre>
  </article>
</main>
`;

describe('annotator/anchoring/text-range', () => {
  describe('TextPosition', () => {
    let container;
    before(() => {
      container = document.createElement('div');
      container.innerHTML = html;
    });

    describe('#constructor', () => {
      it('throws if offset is negative', () => {
        assert.throws(() => {
          new TextPosition(container, -1);
        }, 'Offset is invalid');
      });
    });

    describe('#resolve', () => {
      [
        {
          getPosition: () => 4,
          getNode: () => container.querySelector('p').firstChild,
        },
        {
          getPosition: () => container.textContent.length,
          getNode: () => container.querySelector('pre').firstChild,
          getOffset: () => container.querySelector('pre').textContent.length,
        },
      ].forEach(({ getPosition, getNode, getOffset }) => {
        it('resolves text position to correct node and offset', () => {
          const pos = new TextPosition(container, getPosition());

          const { node, offset } = pos.resolve();

          assert.equal(node, getNode());
          assert.equal(offset, getOffset());
        });
      });

      it('throws if offset exceeds current text content length', () => {
        const pos = new TextPosition(
          container,
          container.textContent.length + 1
        );

        assert.throws(() => {
          pos.resolve();
        }, 'Offset exceeds text length');
      });
    });

    describe('fromPoint', () => {
      it.skip('returns TextPosition for offset in Text node', () => {});

      it.skip('returns TextPosition for offset in Element node', () => {});

      it.skip('ignores ignored parents for offset in Text node', () => {});

      it.skip('ignores ignored parents for offset in Element node', () => {});

      it.skip('throws if node is not a Text or Element', () => {});

      it.skip('throws if Text node has no parent', () => {});

      it.skip('throws if Text node has no non-ignored parent', () => {});

      it.skip('throws if Element node has no parent', () => {});

      it.skip('throws if Element node has no non-ignored parent', () => {});

      it.skip('throws if node is a Text node and offset is invalid', () => {});

      it.skip('throws if Node is an Element node and offset is invalid', () => {});
    });
  });

  describe('TextRange', () => {
    describe('#toRange', () => {
      it.skip('resolves start and end points', () => {});

      it.skip('throws if start or end points cannot be resolved', () => {});
    });

    describe('fromRange', () => {
      it('sets `start` and `end` points of range', () => {});

      it.skip('throws if `start` point cannot be converted to a position', () => {});

      it.skip('throws if `end` point cannot be converted to a position', () => {});
    });
  });
});
