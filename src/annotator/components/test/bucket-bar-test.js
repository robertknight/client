import { createElement } from 'preact';
import { mount } from 'enzyme';

import BucketBar, { buildBuckets, $imports } from '../bucket-bar';

describe('annotator/components/bucket-bar', () => {
  const scrollOffset = 500;
  const screenHeight = 300;

  let fakeBoundingRect;

  beforeEach(() => {
    fakeBoundingRect = highlightElements => {
      const top = Math.min(...highlightElements.map(e => e.top));
      const bottom = Math.max(...highlightElements.map(e => e.bottom));
      return { left: 0, right: 100, top, bottom };
    };

    $imports.$mock({
      '../highlighter': {
        getBoundingClientRect: fakeBoundingRect,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function makeAnchor(top, height = 100) {
    return {
      highlights: [{ top, bottom: top + height }],
      annotation: {},
    };
  }

  describe('buildBuckets', () => {
    [[makeAnchor(0)], [makeAnchor(0), makeAnchor(200)]].forEach(anchors => {
      it('puts anchors above the screen into a single above-screen bucket', () => {
        const buckets = buildBuckets(anchors, scrollOffset, screenHeight);

        assert.equal(buckets.length, 1);
        assert.equal(buckets[0].location, 'above-screen');
        assert.deepEqual(buckets[0].anchors, anchors);
      });
    });

    [[makeAnchor(1000)], [makeAnchor(1000), makeAnchor(2000)]].forEach(
      anchors => {
        it('puts anchors below the screen into a single below-screen bucket', () => {
          const buckets = buildBuckets(anchors, scrollOffset, screenHeight);

          assert.equal(buckets.length, 1);
          assert.equal(buckets[0].location, 'below-screen');
          assert.deepEqual(buckets[0].anchors, anchors);
        });
      }
    );

    it('puts anchors in the viewport into on-screen bucket(s)', () => {
      const anchors = [makeAnchor(500), makeAnchor(700)];

      const buckets = buildBuckets(anchors, scrollOffset, screenHeight);

      assert.equal(buckets.length, 2);
      assert.equal(buckets[0].location, 'on-screen');
      assert.equal(buckets[1].location, 'on-screen');
      assert.deepEqual(buckets[0].anchors, [anchors[0]]);
      assert.deepEqual(buckets[1].anchors, [anchors[1]]);
    });

    it('merges on-screen buckets if the anchors are close enough', () => {
      const anchors = [makeAnchor(500), makeAnchor(600)];

      const buckets = buildBuckets(anchors, scrollOffset, screenHeight);

      assert.equal(buckets.length, 1);
      assert.equal(buckets[0].location, 'on-screen');
      assert.deepEqual(buckets[0].anchors, anchors);
    });

    it('returns an empty bucket list if there are no anchors', () => {
      const buckets = buildBuckets([], scrollOffset, screenHeight);
      assert.equal(buckets.length, 0);
    });
  });

  describe('BucketBar', () => {
    const createBucketBar = (props = {}) =>
      mount(
        <BucketBar
          anchors={[]}
          scrollOffset={scrollOffset}
          scrollHeight={screenHeight}
          {...props}
        />
      );

    it('renders a bucket for above-screen anchors', () => {
      const anchors = [makeAnchor(0)];
      const wrapper = createBucketBar({ anchors });

      const aboveScreenBucket = wrapper.find(
        '.annotator-bucket-indicator.upper'
      );
      assert.isTrue(aboveScreenBucket.exists());
      assert.equal(aboveScreenBucket.text(), '1');
    });

    it('renders a bucket for below-screen anchors', () => {
      const anchors = [makeAnchor(1000)];
      const wrapper = createBucketBar({ anchors });

      const belowScreenBucket = wrapper.find(
        '.annotator-bucket-indicator.lower'
      );
      assert.isTrue(belowScreenBucket.exists());
      assert.equal(belowScreenBucket.text(), '1');
    });

    it('renders buckets for on-screen anchors', () => {
      const anchors = [makeAnchor(500), makeAnchor(600)];
      const wrapper = createBucketBar({ anchors });

      const bucket = wrapper.find(
        '.annotator-bucket-indicator:not(.lower):not(.upper)'
      );
      assert.isTrue(bucket.exists());
      assert.equal(bucket.text(), '2');
    });

    it('scrolls to nearest above-screen anchor when above-screen bucket is clicked', () => {
      const anchors = [makeAnchor(0)];
      const scrollToAnchors = sinon.stub();
      const wrapper = createBucketBar({ anchors, scrollToAnchors });

      const aboveScreenBucket = wrapper.find(
        '.annotator-bucket-indicator.upper'
      );
      aboveScreenBucket.simulate('click');

      assert.calledWith(scrollToAnchors, anchors);
    });

    it('scrolls to nearest below-screen anchor when below-screen bucket is clicked', () => {
      const anchors = [makeAnchor(1000)];
      const scrollToAnchors = sinon.stub();
      const wrapper = createBucketBar({ anchors, scrollToAnchors });

      const belowScreenBucket = wrapper.find(
        '.annotator-bucket-indicator.lower'
      );
      belowScreenBucket.simulate('click');

      assert.calledWith(scrollToAnchors, anchors);
    });

    it('selects annotations when on-screen bucket is clicked', () => {
      const anchors = [makeAnchor(500), makeAnchor(600)];
      const selectAnchors = sinon.stub();
      const scrollToAnchors = sinon.stub();
      const wrapper = createBucketBar({
        anchors,
        selectAnchors,
        scrollToAnchors,
      });

      const bucket = wrapper.find(
        '.annotator-bucket-indicator:not(.lower):not(.upper)'
      );
      bucket.simulate('click');

      assert.calledWith(selectAnchors, anchors);
      assert.notCalled(scrollToAnchors);
    });

    // TODO - Test for y offset of above-screen, on-screen and below-screen buckets.
    // TODO - Test for mouse over and mouse out behavior.
  });
});
