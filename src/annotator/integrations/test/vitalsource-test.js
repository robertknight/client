import {
  VitalSourceIntegration,
  isVitalSource,
  $imports,
} from '../vitalsource';

class FakeVitalSourceViewer {
  constructor() {
    this.bookElement = document.createElement('mosaic-book');
    this.bookElement.attachShadow({ mode: 'open' });

    this.contentFrame = document.createElement('iframe');
    this.bookElement.shadowRoot.append(this.contentFrame);

    document.body.append(this.bookElement);
  }

  destroy() {
    this.bookElement.remove();
  }
}

describe('annotator/integrations/vitalsource', () => {
  let fakeViewer;
  let FakeHTMLIntegration;
  let fakeHTMLIntegration;

  beforeEach(() => {
    fakeViewer = new FakeVitalSourceViewer();

    fakeHTMLIntegration = {
      anchor: sinon.stub(),
      contentContainer: sinon.stub(),
      describe: sinon.stub(),
      destroy: sinon.stub(),
      scrollToAnchor: sinon.stub(),
    };

    FakeHTMLIntegration = sinon.stub().returns(fakeHTMLIntegration);

    $imports.$mock({
      './html': { HTMLIntegration: FakeHTMLIntegration },
    });
  });

  afterEach(() => {
    fakeViewer.destroy();
    $imports.$restore();
  });

  describe('isVitalSource', () => {
    it('returns true if the book container element is found', () => {
      assert.isTrue(isVitalSource());
    });

    it('returns true if the book container element is found in the parent document', () => {
      assert.isTrue(isVitalSource(fakeViewer.contentFrame.contentWindow));
    });

    it('returns false if the book container element is not found', () => {
      fakeViewer.destroy();
      assert.isFalse(isVitalSource());
    });
  });

  describe('VitalSourceIntegration', () => {
    let integration;

    beforeEach(() => {
      integration = new VitalSourceIntegration();
    });

    afterEach(() => {
      integration.destroy();
    });

    it('injects client into chapter content in container frame', () => {
      // integration = new VitalSourceIntegration();
    });

    it('re-injects client when chapter content frame is changed', () => {
      // TODO
    });

    it('stops mouse events from propagating to parent frame', () => {
      // TODO
    });

    it('delegates to HTML integration for creating and anchoring selectors', () => {
      // TODO
    });

    it('delegates to HTML integration for scrolling to anchors', () => {
      // TODO
    });

    describe('#getMetadata', () => {
      it('returns book metadata', () => {
        // TODO
      });
    });

    describe('#uri', () => {
      it('returns book URI excluding query string', () => {
        // TODO
      });
    });
  });
});
