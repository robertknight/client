import { HTMLIntegration, $imports } from '../html';

describe('HTMLIntegration', () => {
  let fakeHTMLAnchoring;
  let fakeHTMLMetadata;
  let fakeScrollIntoView;

  let LocationObserver;
  let fakeLocationObserver;

  beforeEach(() => {
    fakeHTMLAnchoring = {
      anchor: sinon.stub(),
      describe: sinon.stub(),
    };

    fakeHTMLMetadata = {
      getDocumentMetadata: sinon.stub().returns({ title: 'Example site' }),
      uri: sinon.stub().returns('https://example.com/'),
    };

    fakeLocationObserver = {
      disconnect: sinon.stub(),
    };
    LocationObserver = sinon.stub().returns(fakeLocationObserver);

    fakeScrollIntoView = sinon.stub().yields();

    const HTMLMetadata = sinon.stub().returns(fakeHTMLMetadata);
    $imports.$mock({
      'scroll-into-view': fakeScrollIntoView,
      '../anchoring/html': fakeHTMLAnchoring,
      '../location-observer': { LocationObserver },
      './html-metadata': { HTMLMetadata },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('implements `anchor` and `destroy` using HTML anchoring', () => {
    const integration = new HTMLIntegration();
    assert.equal(integration.anchor, fakeHTMLAnchoring.anchor);
    assert.equal(integration.describe, fakeHTMLAnchoring.describe);
  });

  it('emits `uriChanged` event when document URI changes', async () => {
    const integration = new HTMLIntegration();
    const uriChanged = sinon.stub();
    integration.on('uriChanged', uriChanged);

    assert.calledOnce(LocationObserver);
    const locationChangedCallback = LocationObserver.args[0][0];

    await locationChangedCallback();
    assert.calledWith(uriChanged, fakeHTMLMetadata.uri());
  });

  describe('#contentContainer', () => {
    it('returns body by default', () => {
      const integration = new HTMLIntegration();
      assert.equal(integration.contentContainer(), document.body);
    });
  });

  describe('#destroy', () => {
    it('stops observing URI changes', () => {
      const integration = new HTMLIntegration();

      integration.destroy();

      assert.calledOnce(LocationObserver);
      assert.calledOnce(fakeLocationObserver.disconnect);
    });
  });

  describe('#fitSideBySide', () => {
    it('does nothing', () => {
      new HTMLIntegration().fitSideBySide({});
    });
  });

  describe('#getMetadata', () => {
    it('returns document metadata', async () => {
      const integration = new HTMLIntegration();
      assert.deepEqual(await integration.getMetadata(), {
        title: 'Example site',
      });
    });
  });

  describe('#scrollToAnchor', () => {
    it('scrolls to first highlight of anchor', async () => {
      const highlight = document.createElement('div');
      document.body.appendChild(highlight);

      const anchor = { highlights: [highlight] };

      const integration = new HTMLIntegration();
      await integration.scrollToAnchor(anchor);

      assert.calledOnce(fakeScrollIntoView);
      assert.calledWith(fakeScrollIntoView, highlight, sinon.match.func);
    });
  });

  describe('#uri', () => {
    it('returns main document URL', async () => {
      const integration = new HTMLIntegration();
      assert.deepEqual(await integration.uri(), 'https://example.com/');
    });
  });
});
