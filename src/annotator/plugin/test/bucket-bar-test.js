import BucketBar from '../bucket-bar';
import { $imports } from '../bucket-bar';

// Return DOM elements for non-empty bucket indicators in a `BucketBar`.
const nonEmptyBuckets = function (bucketBar) {
  const buckets = bucketBar.element.querySelectorAll(
    '.annotator-bucket-indicator'
  );
  return Array.from(buckets).filter(bucket => {
    const label = bucket.querySelector('.label');
    return parseInt(label.textContent) > 0;
  });
};

const createMouseEvent = function (type, { ctrlKey, metaKey } = {}) {
  return new MouseEvent(type, { ctrlKey, metaKey });
};

describe('BucketBar', () => {
  let fakeAnnotator;
  let fakeBucketUtil;

  beforeEach(() => {
    fakeAnnotator = {
      anchors: [],
      selectAnnotations: sinon.stub(),
    };

    fakeBucketUtil = {
      findClosestOffscreenAnchor: sinon.stub(),
      constructPositionPoints: sinon
        .stub()
        .returns({ above: [], below: [], points: [] }),
      buildBuckets: sinon.stub().returns([]),
    };

    $imports.$mock({
      '../util/buckets': fakeBucketUtil,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const createBucketBar = function (options) {
    const element = document.createElement('div');
    return new BucketBar(element, options || {}, fakeAnnotator);
  };

  // Create a fake anchor, which is a combination of annotation object and
  // associated highlight elements.
  const createAnchor = () => {
    return {
      annotation: { $tag: 'ann1' },
      highlights: [document.createElement('span')],
    };
  };

  context('when a bucket is clicked', () => {
    let bucketBar;

    beforeEach(() => {
      bucketBar = createBucketBar();
      // Create fake anchors and render buckets.
      const anchors = [createAnchor()];

      fakeBucketUtil.buildBuckets.returns({
        index: [250],
        buckets: [[anchors[0]]],
      });

      bucketBar.annotator.anchors = anchors;
      bucketBar._update();
    });

    it('selects the annotations', () => {
      // Click on the indicator for the non-empty bucket.
      const bucketEls = nonEmptyBuckets(bucketBar);
      assert.equal(bucketEls.length, 1);
      bucketEls[0].dispatchEvent(createMouseEvent('click'));

      const anns = bucketBar.annotator.anchors.map(anchor => anchor.annotation);
      assert.calledWith(bucketBar.annotator.selectAnnotations, anns, false);
    });

    [
      { ctrlKey: true, metaKey: false },
      { ctrlKey: false, metaKey: true },
    ].forEach(({ ctrlKey, metaKey }) =>
      it('toggles selection of the annotations if Ctrl or Alt is pressed', () => {
        // Click on the indicator for the non-empty bucket.
        const bucketEls = nonEmptyBuckets(bucketBar);
        assert.equal(bucketEls.length, 1);
        bucketEls[0].dispatchEvent(
          createMouseEvent('click', { ctrlKey, metaKey })
        );

        const anns = bucketBar.annotator.anchors.map(
          anchor => anchor.annotation
        );
        assert.calledWith(bucketBar.annotator.selectAnnotations, anns, true);
      })
    );
  });

  // Yes this is testing a private method. Yes this is bad practice, but I'd
  // rather test this functionality in a private method than not test it at all.
  //
  // Note: This could be tested using only the public APIs of the `BucketBar`
  // class using the approach of the "when a bucket is clicked" tests above.
  describe('_buildTabs', () => {
    const setup = function (tab) {
      const bucketBar = createBucketBar();
      bucketBar.tabs = [tab];
      bucketBar.buckets = [['AN ANNOTATION?']];
      bucketBar.index = [
        0,
        BucketBar.BUCKET_TOP_THRESHOLD - 1,
        BucketBar.BUCKET_TOP_THRESHOLD,
      ];
      return bucketBar;
    };

    function createTab() {
      return document.createElement('div');
    }

    it('creates a tab with a title', () => {
      const tab = createTab();
      const bucketBar = setup(tab);

      bucketBar._buildTabs();
      assert.equal(tab.getAttribute('title'), 'Show one annotation');
    });

    it('creates a tab with a pluralized title', () => {
      const tab = createTab();
      const bucketBar = setup(tab);
      bucketBar.buckets[0].push('Another Annotation?');

      bucketBar._buildTabs();
      assert.equal(tab.getAttribute('title'), 'Show 2 annotations');
    });

    it('sets the tab text to the number of annotations', () => {
      const tab = createTab();
      const bucketBar = setup(tab);
      bucketBar.buckets[0].push('Another Annotation?');

      bucketBar._buildTabs();
      assert.equal(tab.textContent, '2');
    });

    it('sets the tab text to the number of annotations', () => {
      const tab = createTab();
      const bucketBar = setup(tab);
      bucketBar.buckets[0].push('Another Annotation?');

      bucketBar._buildTabs();
      assert.equal(tab.textContent, '2');
    });

    it('adds the class "upper" if the annotation is at the top', () => {
      const tab = createTab();
      const bucketBar = setup(tab);
      sinon.stub(bucketBar, 'isUpper').returns(true);

      bucketBar._buildTabs();
      assert.equal(tab.classList.contains('upper'), true);
    });

    it('removes the class "upper" if the annotation is not at the top', () => {
      const tab = createTab();
      tab.classList.add('upper');
      const bucketBar = setup(tab);
      sinon.stub(bucketBar, 'isUpper').returns(false);

      bucketBar._buildTabs();
      assert.equal(tab.classList.contains('upper'), false);
    });

    it('adds the class "lower" if the annotation is at the top', () => {
      const tab = createTab();
      const bucketBar = setup(tab);
      sinon.stub(bucketBar, 'isLower').returns(true);

      bucketBar._buildTabs();
      assert.equal(tab.classList.contains('lower'), true);
    });

    it('removes the class "lower" if the annotation is not at the top', () => {
      const tab = createTab();
      tab.classList.add('lower');
      const bucketBar = setup(tab);
      sinon.stub(bucketBar, 'isLower').returns(false);

      bucketBar._buildTabs();
      assert.equal(tab.classList.contains('lower'), false);
    });

    it('reveals the tab if there are annotations in the bucket', () => {
      const tab = createTab();
      const bucketBar = setup(tab);

      bucketBar._buildTabs();
      assert.equal(tab.style.display, '');
    });

    it('hides the tab if there are no annotations in the bucket', () => {
      const tab = createTab();
      const bucketBar = setup(tab);
      bucketBar.buckets = [];

      bucketBar._buildTabs();
      assert.equal(tab.style.display, 'none');
    });
  });
});
