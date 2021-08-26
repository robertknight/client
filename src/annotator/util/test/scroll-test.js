import { offsetRelativeTo, scrollElement, scrollIntoView } from '../scroll';

describe('annotator/util/scroll', () => {
  let containers;

  beforeEach(() => {
    sinon.stub(window, 'requestAnimationFrame');
    window.requestAnimationFrame.yields();
    containers = [];
  });

  afterEach(() => {
    containers.forEach(c => c.remove());
    window.requestAnimationFrame.restore();
  });

  function createContainer() {
    const container = document.createElement('div');

    container.style.position = 'relative';
    container.style.overflow = 'scroll';
    container.style.width = '200px';
    container.style.height = '200px';

    containers.push(container);
    document.body.append(container);
    return container;
  }

  describe('offsetRelativeTo', () => {
    it('returns the offset of an element relative to the given ancestor', () => {
      const parent = createContainer();
      parent.style.position = 'relative';

      const child = document.createElement('div');
      child.style.position = 'absolute';
      child.style.top = '100px';
      parent.append(child);

      const grandchild = document.createElement('div');
      grandchild.style.position = 'absolute';
      grandchild.style.top = '150px';
      child.append(grandchild);

      assert.equal(offsetRelativeTo(child, parent), 100);
      assert.equal(offsetRelativeTo(grandchild, parent), 250);
    });

    it('returns 0 if the parent is not an ancestor of the element', () => {
      const parent = document.createElement('div');
      const child = document.createElement('div');
      child.style.position = 'absolute';
      child.style.top = '100px';

      assert.equal(offsetRelativeTo(child, parent), 0);
    });
  });

  describe('scrollElement', () => {
    it("animates the element's `scrollTop` offset to the target position", async () => {
      const container = createContainer();

      const child = document.createElement('div');
      child.style.height = '3000px';
      container.append(child);

      await scrollElement(container, 2000, { maxDuration: 5 });

      assert.equal(container.scrollTop, 2000);
      container.remove();
    });
  });

  describe('scrollIntoView', () => {
    function assertScrolledToBottom(container) {
      const expectedScrollTop = container.scrollHeight - container.clientHeight;

      // Use approximate equality check to disregard differences in rounding
      // between properties.
      assert.approximately(container.scrollTop, expectedScrollTop, 1);
    }

    it('scrolls the element into view', async () => {
      const container = createContainer();

      const child = document.createElement('div');
      child.style.position = 'absolute';
      child.style.top = '500px';
      child.append('Some content');
      container.append(child);

      await scrollIntoView(child, { maxDuration: 5 });

      assertScrolledToBottom(container);
    });

    it('scrolls the element into view if it is in a same-origin iframe', async () => {
      const container = createContainer();

      const frame = document.createElement('iframe');
      frame.style.width = '200px';
      frame.style.height = '200px';
      frame.style.position = 'absolute';
      frame.style.top = '500px';
      container.append(frame);

      const child = frame.contentDocument.createElement('div');
      child.style.position = 'relative';
      child.style.top = '500px';
      child.append('Some content');

      const frameBody = frame.contentDocument.body;
      frameBody.append(child);

      await scrollIntoView(child, { maxDuration: 5 });

      // Container of child should scroll so that it is in view.
      assertScrolledToBottom(frameBody);
      // The parent document should also be scrolled so that the relevant
      // part of the iframe containing `child` is in view.
      assert.equal(container.scrollTop, 500);
    });

    it('does nothing if element is not in current or child document', async () => {
      const doc = document.implementation.createHTMLDocument();
      const child = doc.createElement('div');

      // Scrolling disconnected child should have no effect.
      await scrollIntoView(child, { maxDuration: 5 });

      // Scrolling child in document that is not current or descendant of current
      // document should have no effect.
      doc.body.appendChild(child);
      await scrollIntoView(child, { maxDuration: 5 });
    });
  });
});
