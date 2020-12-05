import {
  RangeAnchor,
  TextPositionAnchor,
  TextQuoteAnchor,
  $imports,
} from '../types';

// These are primarily basic API tests for the anchoring classes. Tests for
// anchoring a variety of HTML and PDF content exist in `html-test` and
// `pdf-test`.
describe('annotator/anchoring/types', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = [
      'Four score and seven years ago our fathers brought forth on this continent,',
      'a new nation, conceived in Liberty, and dedicated to the proposition that',
      'all men are created equal.',
    ].join(' ');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  describe('RangeAnchor', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `<main><article><empty></empty><p>This is </p><p>a test article</p></article><empty-b></empty-b></main>`;
    });

    afterEach(() => {
      $imports.$restore();
    });

    describe('#fromRange', () => {
      it('returns a RangeAnchor instance', () => {
        const range = new Range();
        range.selectNodeContents(container);

        const anchor = RangeAnchor.fromRange(container, range);

        assert.instanceOf(anchor, RangeAnchor);
        assert.equal(anchor.root, container);
        assert.equal(anchor.range, range);
      });
    });

    describe('#fromSelector', () => {
      it('returns a RangeAnchor instance', () => {
        const anchor = RangeAnchor.fromSelector(container, {
          type: 'RangeSelector',
          startContainer: '/main[1]/article[1]',
          startOffset: 0,
          endContainer: '/main[1]/article[1]/p[2]',
          endOffset: 1,
        });
        assert.instanceOf(anchor, RangeAnchor);
        assert.equal(anchor.range.toString(), 'This is a');
      });

      [
        // Invalid `startContainer`
        [
          {
            type: 'RangeSelector',
            startContainer: '/main[1]/invalid[1]',
            startOffset: 0,
            endContainer: '/main[1]/article[1]',
            endOffset: 1,
          },
          'Failed to resolve startContainer XPath',
        ],

        // Invalid `endContainer`
        [
          {
            type: 'RangeSelector',
            startContainer: '/main[1]/article[1]',
            startOffset: 0,
            endContainer: '/main[1]/invalid[1]',
            endOffset: 1,
          },
          'Failed to resolve endContainer XPath',
        ],

        // Invalid `startOffset`
        [
          {
            type: 'RangeSelector',
            startContainer: '/main[1]/article[1]',
            startOffset: 50,
            endContainer: '/main[1]/invalid[1]',
            endOffset: 1,
          },
          'Offset exceeds text length',
        ],

        // Invalid `endOffset`
        [
          {
            type: 'RangeSelector',
            startContainer: '/main[1]/article[1]',
            startOffset: 0,
            endContainer: '/main[1]/article[1]',
            endOffset: 50,
          },
          'Offset exceeds text length',
        ],
      ].forEach(([selector, expectedError]) => {
        it('throws if selector fails to resolve', () => {
          assert.throws(() => {
            RangeAnchor.fromSelector(container, selector);
          }, expectedError);
        });
      });
    });

    describe('#toRange', () => {
      it('returns the range', () => {
        const range = new Range();
        const anchor = new RangeAnchor(container, range);
        assert.equal(anchor.toRange(), range);
      });
    });

    describe('#toSelector', () => {
      it('returns a valid `RangeSelector` selector', () => {
        const range = new Range();
        range.setStart(container.querySelector('p'), 0);
        range.setEnd(container.querySelector('p:nth-of-type(2)').firstChild, 1);

        const anchor = new RangeAnchor(container, range);

        assert.deepEqual(anchor.toSelector(), {
          type: 'RangeSelector',
          startContainer: '/main[1]/article[1]/p[1]',
          startOffset: 0,
          endContainer: '/main[1]/article[1]/p[2]',
          endOffset: 1,
        });
      });

      it('returns a selector which references the closest elements to the text', () => {
        const range = new Range();
        range.setStart(container.querySelector('empty'), 0);
        range.setEnd(container.querySelector('empty-b'), 0);

        const anchor = new RangeAnchor(container, range);

        // Even though the range starts and ends in `empty*` elements, the
        // returned selector should reference the elements which most closely
        // wrap the text.
        assert.deepEqual(anchor.toSelector(), {
          type: 'RangeSelector',
          startContainer: '/main[1]/article[1]/p[1]',
          startOffset: 0,
          endContainer: '/main[1]/article[1]/p[2]',
          endOffset: 14,
        });
      });
    });
  });

  describe('TextPositionAnchor', () => {
    let FakeTextRange;

    beforeEach(() => {
      const textRange = {
        start: { element: container, offset: 0 },
        end: { element: container, offset: 1 },

        relativeTo: sinon.stub(),
        toRange: sinon.stub(),
      };

      FakeTextRange = {
        fromOffsets: sinon.stub().returns(textRange),
        fromRange: sinon.stub().returns(textRange),
        instance: textRange,
      };

      $imports.$mock({
        './text-range': {
          TextRange: FakeTextRange,
        },
      });
    });

    afterEach(() => {
      $imports.$restore();
    });

    function createTextPositionAnchor() {
      return new TextPositionAnchor(container, 0, 0);
    }

    describe('#fromRange', () => {
      it('returns a TextPositionAnchor instance', () => {
        FakeTextRange.instance.relativeTo.returns(FakeTextRange.instance);
        const range = new Range();

        const anchor = TextPositionAnchor.fromRange(container, range);

        assert.calledWith(FakeTextRange.fromRange, range);
        assert.calledWith(FakeTextRange.instance.relativeTo, container);
        assert.equal(anchor.start, FakeTextRange.instance.start.offset);
        assert.equal(anchor.end, FakeTextRange.instance.end.offset);
      });
    });

    describe('#fromSelector', () => {
      it('returns a TextPositionAnchor instance', () => {
        const anchor = TextPositionAnchor.fromSelector(container, {
          start: 0,
          end: 1,
        });
        assert.equal(anchor.start, 0);
        assert.equal(anchor.end, 1);
      });
    });

    describe('#toSelector', () => {
      it('returns a TextPositionSelector', () => {
        const anchor = createTextPositionAnchor();
        assert.deepEqual(anchor.toSelector(), {
          type: 'TextPositionSelector',
          start: 0,
          end: 0,
        });
      });
    });

    describe('#toRange', () => {
      it('returns a range object', () => {
        FakeTextRange.instance.toRange.returns('fake range');
        const anchor = createTextPositionAnchor();
        assert.equal(anchor.toRange(), 'fake range');
        assert.calledWith(
          FakeTextRange.fromOffsets,
          container,
          anchor.start,
          anchor.end
        );
      });
    });

    describe('integration tests', () => {
      beforeEach(() => {
        $imports.$restore({
          './text-range': true,
        });
      });

      it('can convert a Range to TextPositionSelector and back to a Range', () => {
        const range = document.createRange();
        range.setStart(container.firstChild, 0);
        range.setEnd(container.firstChild, 4);
        const anchor = TextPositionAnchor.fromRange(container, range);
        assert.deepEqual(anchor.toSelector(), {
          type: 'TextPositionSelector',
          start: 0,
          end: 4,
        });
        const newRange = anchor.toRange();
        assert.deepEqual(newRange, range);
        assert.equal(newRange.toString(), 'Four');
      });
    });
  });

  describe('TextQuoteAnchor', () => {
    let fakeQuoteToRange;
    let fakeQuoteFromRange;
    let fakeToTextPosition;

    beforeEach(() => {
      fakeQuoteToRange = sinon.stub();
      fakeQuoteFromRange = sinon.stub();
      fakeToTextPosition = sinon.stub();
      $imports.$mock({
        'dom-anchor-text-quote': {
          fromRange: fakeQuoteFromRange,
          toRange: fakeQuoteToRange,
          toTextPosition: fakeToTextPosition,
        },
      });
    });

    afterEach(() => {
      $imports.$restore();
    });

    function createTextQuoteAnchor() {
      return new TextQuoteAnchor(container, 'Liberty', {
        prefix: 'a new nation, conceived in ',
        suffix: ', and dedicated to the proposition that',
      });
    }

    describe('#fromRange', () => {
      it('returns a TextQuoteAnchor instance', () => {
        fakeQuoteFromRange.returns({
          prefix: 'Four score and ',
          suffix: 'brought forth on this continent',
        });
        const anchor = TextQuoteAnchor.fromRange(container, new Range());
        assert.called(fakeQuoteFromRange);
        assert.instanceOf(anchor, TextQuoteAnchor);
      });
    });

    describe('#fromSelector', () => {
      it('returns a TextQuoteAnchor instance', () => {
        const anchor = TextQuoteAnchor.fromSelector(container, {
          type: 'TextQuoteSelector',
          exact: 'Liberty',
          prefix: 'a new nation, conceived in ',
          suffix: ', and dedicated to the proposition that',
        });
        assert.instanceOf(anchor, TextQuoteAnchor);
      });
    });

    describe('#toSelector', () => {
      it('returns a TextQuoteSelector', () => {
        const anchor = createTextQuoteAnchor();
        assert.deepEqual(anchor.toSelector(), {
          type: 'TextQuoteSelector',
          exact: 'Liberty',
          prefix: 'a new nation, conceived in ',
          suffix: ', and dedicated to the proposition that',
        });
      });
    });

    describe('#toRange', () => {
      it('returns a valid DOM Range', () => {
        $imports.$restore({
          'dom-anchor-text-quote': {
            toRange: true,
          },
        });
        const quoteAnchor = new TextQuoteAnchor(container, 'Liberty');
        const range = quoteAnchor.toRange();
        assert.instanceOf(range, Range);
        assert.equal(range.toString(), 'Liberty');
      });

      it('throws if the quote is not found', () => {
        $imports.$restore({
          'dom-anchor-text-quote': {
            toRange: true,
          },
        });
        const quoteAnchor = new TextQuoteAnchor(
          container,
          'five score and nine years ago'
        );
        assert.throws(() => {
          quoteAnchor.toRange();
        });
      });
    });

    describe('#toPositionAnchor', () => {
      it('returns a TextPositionAnchor instance', () => {
        $imports.$restore({
          'dom-anchor-text-quote': {
            toTextPosition: true,
          },
        });
        const quoteAnchor = new TextQuoteAnchor(container, 'Liberty');
        const pos = quoteAnchor.toPositionAnchor();
        assert.instanceOf(pos, TextPositionAnchor);
      });

      it('throws if the quote is not found', () => {
        $imports.$restore({
          'dom-anchor-text-quote': {
            toTextPosition: true,
          },
        });
        const quoteAnchor = new TextQuoteAnchor(
          container,
          'some are more equal than others'
        );
        assert.throws(() => {
          quoteAnchor.toPositionAnchor();
        });
      });
    });

    describe('integration tests', () => {
      beforeEach(() => {
        // restore dom-anchor-text-quote to test third party lib integration
        $imports.$restore({
          'dom-anchor-text-quote': true,
        });
      });

      it('can convert a Range to TextQuoteSelector and back to a Range', () => {
        const range = document.createRange();
        range.setStart(container.firstChild, 0);
        range.setEnd(container.firstChild, 4);
        const anchor = TextQuoteAnchor.fromRange(container, range);
        assert.deepEqual(anchor.toSelector(), {
          type: 'TextQuoteSelector',
          prefix: '',
          suffix: ' score and seven years ago our f',
          exact: 'Four',
        });
        const newRange = anchor.toRange();
        assert.equal(newRange.toString(), 'Four');
      });
    });
  });
});
