import Delegator from '../delegator';
import scrollIntoView from 'scroll-into-view';
import {
  findClosestOffscreenAnchor,
  constructPositionPoints,
  buildBuckets,
} from '../util/buckets';
import { setHighlightsFocused } from '../highlighter';

const BUCKET_SIZE = 16; // Regular bucket size
const BUCKET_NAV_SIZE = BUCKET_SIZE + 6; // Bucket plus arrow (up/down)
const BUCKET_TOP_THRESHOLD = 115 + BUCKET_NAV_SIZE; // Toolbar

// Scroll to the next closest anchor off screen in the given direction.
function scrollToClosest(anchors, direction) {
  const closest = findClosestOffscreenAnchor(anchors, direction);
  if (closest && closest.highlights?.length) {
    scrollIntoView(closest.highlights[0]);
  }
}

/**
 * @param {number} val
 */
function toPx(val) {
  return val + 'px';
}

export default class BucketBar extends Delegator {
  constructor(element, options, annotator) {
    const defaultOptions = {
      // gapSize parameter is used by the clustering algorithm
      // If an annotation is farther then this gapSize from the next bucket
      // then that annotation will not be merged into the bucket
      // TODO: This is not currently used; reassess
      gapSize: 60,
      // Selectors for the scrollable elements on the page
      scrollables: ['body'],
    };

    const opts = { ...defaultOptions, ...options };

    const container = document.createElement('div');
    container.className = 'annotator-bucket-bar';
    super(container, opts);

    this.buckets = [];
    this.index = [];

    /** @type {HTMLElement[]} */
    this.tabs = [];

    if (this.options.container) {
      const containerEl = document.querySelector(this.options.container);
      containerEl.appendChild(this.element);
    } else {
      element.appendChild(this.element);
    }

    this.annotator = annotator;

    this.updateFunc = () => this.update();

    ['resize', 'scroll'].forEach(event =>
      window.addEventListener(event, this.updateFunc)
    );

    this.options.scrollables.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.addEventListener('scroll', this.updateFunc));
    });
  }

  destroy() {
    ['resize', 'scroll'].forEach(event =>
      window.removeEventListener(event, this.updateFunc)
    );
    this.options.scrollables.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.removeEventListener('scroll', this.updateFunc));
    });
  }

  update() {
    if (this._updatePending) {
      return;
    }
    this._updatePending = true;
    requestAnimationFrame(() => {
      const updated = this._update();
      this._updatePending = false;
      return updated;
    });
  }

  _update() {
    const { above, below, points } = constructPositionPoints(
      this.annotator.anchors
    );

    const bucketInfo = buildBuckets(points);
    this.buckets = bucketInfo.buckets;
    this.index = bucketInfo.index;

    // Scroll up
    this.buckets.unshift([], above, []);
    this.index.unshift(0, BUCKET_TOP_THRESHOLD - 1, BUCKET_TOP_THRESHOLD);

    // Scroll down
    this.buckets.push([], below, []);
    this.index.push(
      window.innerHeight - BUCKET_NAV_SIZE,
      window.innerHeight - BUCKET_NAV_SIZE + 1,
      window.innerHeight
    );

    // Remove any extra tabs and update tabs.
    this.tabs.slice(this.buckets.length).forEach(tabEl => tabEl.remove());
    this.tabs = this.tabs.slice(0, this.buckets.length);

    // Create any new tabs if needed.
    // eslint-disable-next-line no-unused-vars
    for (let bucket of this.buckets.slice(this.tabs.length)) {
      const div = document.createElement('div');
      this.element.appendChild(div);

      this.tabs.push(div);

      div.classList.add('annotator-bucket-indicator');

      // Focus corresponding highlights bucket when mouse is hovered
      // TODO: This should use event delegation on the container.
      div.addEventListener('mousemove', event => {
        const bucketIndex = this.tabs.indexOf(
          /** @type {HTMLElement} */ (event.currentTarget)
        );
        for (let anchor of this.annotator.anchors) {
          const toggle = this.buckets[bucketIndex].includes(anchor);
          if (anchor.highlights) {
            setHighlightsFocused(anchor.highlights, toggle);
          }
        }
      });

      div.addEventListener('mouseout', event => {
        const bucket = this.tabs.indexOf(
          /** @type {HTMLElement} */ (event.currentTarget)
        );
        this.buckets[bucket].forEach(anchor => {
          if (anchor.highlights) {
            setHighlightsFocused(anchor.highlights, false);
          }
        });
      });

      div.addEventListener('click', event => {
        const bucket = this.tabs.indexOf(
          /** @type {HTMLElement} */ (event.currentTarget)
        );
        event.stopPropagation();

        // If it's the upper tab, scroll to next anchor above
        if (this.isUpper(bucket)) {
          scrollToClosest(this.buckets[bucket], 'up');
          // If it's the lower tab, scroll to next anchor below
        } else if (this.isLower(bucket)) {
          scrollToClosest(this.buckets[bucket], 'down');
        } else {
          const annotations = this.buckets[bucket].map(
            anchor => anchor.annotation
          );
          this.annotator.selectAnnotations(
            annotations,
            event.ctrlKey || event.metaKey
          );
        }
      });
    }

    this._buildTabs();
  }

  _buildTabs() {
    this.tabs.forEach((el, index) => {
      let bucketSize;
      const bucket = this.buckets[index];
      const bucketLength = bucket?.length;

      const title = (() => {
        if (bucketLength !== 1) {
          return `Show ${bucketLength} annotations`;
        } else if (bucketLength > 0) {
          return 'Show one annotation';
        }
        return '';
      })();

      el.setAttribute('title', title);
      el.classList.toggle('upper', this.isUpper(index));
      el.classList.toggle('lower', this.isLower(index));

      if (this.isUpper(index) || this.isLower(index)) {
        bucketSize = BUCKET_NAV_SIZE;
      } else {
        bucketSize = BUCKET_SIZE;
      }

      el.style.top = toPx((this.index[index] + this.index[index + 1]) / 2);
      el.style.marginTop = toPx(-bucketSize / 2);
      el.style.display = !bucketLength ? 'none' : '';

      if (bucket) {
        el.innerHTML = `<div class='label'>${bucketLength}</div>`;
      }
    });
  }

  isUpper(i) {
    return i === 1;
  }

  isLower(i) {
    return i === this.index.length - 2;
  }
}

// Export constants
BucketBar.BUCKET_SIZE = BUCKET_SIZE;
BucketBar.BUCKET_NAV_SIZE = BUCKET_NAV_SIZE;
BucketBar.BUCKET_TOP_THRESHOLD = BUCKET_TOP_THRESHOLD;
