import { createIntegration, $imports } from '../index';

describe('createIntegration', () => {
  let FakeHTMLIntegration;
  let FakePDFIntegration;
  let FakeVitalSourceIntegration;
  let fakeIsPDF;
  let fakeIsVitalSource;

  beforeEach(() => {
    FakeHTMLIntegration = sinon.stub();
    FakePDFIntegration = sinon.stub();
    fakeIsPDF = sinon.stub().returns(false);
    fakeIsVitalSource = sinon.stub().returns(false);

    $imports.$mock({
      './html': { HTMLIntegration: FakeHTMLIntegration },
      './pdf': { PDFIntegration: FakePDFIntegration, isPDF: fakeIsPDF },
      './vitalsource': {
        VitalSourceIntegration: FakeVitalSourceIntegration,
        isVitalSource: fakeIsVitalSource,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('creates PDF integration in the PDF.js viewer', () => {
    const annotator = {};
    fakeIsPDF.returns(true);

    const integration = createIntegration(annotator);

    assert.calledWith(FakePDFIntegration, annotator);
    assert.instanceOf(integration, FakePDFIntegration);
  });

  it('creates VitalSource integration in the VitalSource Bookshelf reader', () => {
    const clientURL = 'https://cdn.hypothes.is/hypothesis';
    const annotator = {};
    fakeIsVitalSource.returns(true);

    const integration = createIntegration(annotator, clientURL);

    assert.calledWith(FakeVitalSourceIntegration, clientURL);
    assert.instanceOf(integration, FakeVitalSourceIntegration);
  });

  it('creates HTML integration in web pages', () => {
    const annotator = {};

    const integration = createIntegration(annotator);

    assert.calledWith(FakeHTMLIntegration);
    assert.instanceOf(integration, FakeHTMLIntegration);
  });
});
