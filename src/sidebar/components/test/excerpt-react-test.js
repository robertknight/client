'use strict';

const { createElement } = require('preact');
const { mount } = require('enzyme');

const Excerpt = require('../excerpt-react');

// TODO - These tests were copied from the Angular component tests. Port
// them so that they work with the React component.

describe.skip('Excerpt', () => {
  // ExcerptOverflowMonitor fake instance created by the current test
  let fakeOverflowMonitor;

  const SHORT_DIV = <div id="foo" style="height: 5px;" />;
  const TALL_DIV = (
    <div id="foo" style="height: 200px;">
      foo bar
    </div>
  );

  function renderExcerpt(props = {}, content = <span />) {
    const defaultProps = {
      enabled: true,
      contentData: 'the content',
      collapsedHeight: 40,
      inlineControls: false,
    };
    props = { ...defaultProps, ...props };
    return mount(<Excerpt {...props}>{content}</Excerpt>);
  }

  beforeEach(() => {
    class FakeOverflowMonitor {
      constructor(ctrl) {
        fakeOverflowMonitor = this; // eslint-disable-line consistent-this

        this.ctrl = ctrl;
        this.check = sinon.stub();
        this.contentStyle = sinon.stub().returns({});
      }
    }
    fakeOverflowMonitor = new FakeOverflowMonitor();
  });

  context('when created', () => {
    it('schedules an overflow state recalculation', () => {
      renderExcerpt();
      assert.called(fakeOverflowMonitor.check);
    });

    it('passes input properties to overflow state recalc', () => {
      const props = {
        animate: false,
        enabled: true,
        collapsedHeight: 40,
        inlineControls: false,
        overflowHysteresis: 20,
      };
      renderExcerpt(props);
      assert.deepEqual(fakeOverflowMonitor.ctrl.getState(), {
        animate: props.animate,
        enabled: props.enabled,
        collapsedHeight: props.collapsedHeight,
        collapse: true,
        overflowHysteresis: props.overflowHysteresis,
      });
    });

    it('reports the content height to ExcerptOverflowMonitor', () => {
      renderExcerpt({}, TALL_DIV);
      assert.deepEqual(fakeOverflowMonitor.ctrl.contentHeight(), 200);
    });
  });

  context('input changes', () => {
    it('schedules an overflow state check when inputs change', () => {
      const element = renderExcerpt();
      fakeOverflowMonitor.check.reset();
      element.scope.contentData = 'new-content';
      element.scope.$digest();
      assert.calledOnce(fakeOverflowMonitor.check);
    });

    it('does not schedule a state check if inputs are unchanged', () => {
      const element = renderExcerpt();
      fakeOverflowMonitor.check.reset();
      element.scope.$digest();
      assert.notCalled(fakeOverflowMonitor.check);
    });
  });

  context('document events', () => {
    it('schedules an overflow check when media loads', () => {
      const element = renderExcerpt(
        {},
        <img src="https://example.com/foo.jpg" />
      );
      fakeOverflowMonitor.check.reset();
      util.sendEvent(element[0], 'load');
      assert.called(fakeOverflowMonitor.check);
    });

    it('schedules an overflow check when the window is resized', () => {
      const element = renderExcerpt();
      fakeOverflowMonitor.check.reset();
      util.sendEvent(element[0].ownerDocument.defaultView, 'resize');
      assert.called(fakeOverflowMonitor.check);
    });
  });

  context('visibility changes', () => {
    it('schedules an overflow check when shown', () => {
      const element = renderExcerpt();
      fakeOverflowMonitor.check.reset();

      // ng-hide is the class used by the ngShow and ngHide directives
      // to show or hide elements. For now, this is the only way of hiding
      // or showing excerpts that we need to support.
      element[0].classList.add('ng-hide');
      element.scope.$digest();
      assert.notCalled(fakeOverflowMonitor.check);

      element[0].classList.remove('ng-hide');
      element.scope.$digest();
      assert.called(fakeOverflowMonitor.check);
    });
  });

  context('excerpt content style', () => {
    it('sets the content style using ExcerptOverflowMonitor#contentStyle()', () => {
      const element = renderExcerpt();
      fakeOverflowMonitor.contentStyle.returns({ 'max-height': '52px' });
      element.scope.$digest();
      const content = element[0].querySelector('.excerpt');
      assert.equal(content.style.cssText.trim(), 'max-height: 52px;');
    });
  });

  describe('enabled state', () => {
    it('renders its contents in a .excerpt element by default', () => {
      const wrapper = renderExcerpt({}, <span id="foo" />);

      assert.equal(wrapper.find('.excerpt #foo').length, 1);
    });

    it('when enabled, renders its contents in a .excerpt element', () => {
      const wrapper = renderExcerpt({ enabled: true }, <span id="foo" />);

      assert.equal(wrapper.find('.excerpt #foo').length, 1);
    });

    it('when disabled, renders its contents but not in a .excerpt element', () => {
      const wrapper = renderExcerpt({ enabled: false }, <span id="foo" />);

      assert.equal(wrapper.find('.excerpt #foo').length, 0);
      assert.equal(wrapper.find('#foo').length, 1);
    });
  });

  function isHidden(el) {
    return !el.offsetParent || el.classList.contains('ng-hide');
  }

  function findVisible(el, selector) {
    const elements = el.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      if (!isHidden(elements[i])) {
        return elements[i];
      }
    }
    return undefined;
  }

  describe('inline controls', () => {
    function findInlineControl(el) {
      return findVisible(el, '.excerpt__toggle-link');
    }

    it('displays inline controls if collapsed', () => {
      const element = renderExcerpt({ inlineControls: true }, TALL_DIV);
      fakeOverflowMonitor.ctrl.onOverflowChanged(true);
      const expandLink = findInlineControl(element[0]);
      assert.ok(expandLink);
      assert.equal(expandLink.querySelector('a').textContent, 'More');
    });

    it('does not display inline controls if not collapsed', () => {
      const element = renderExcerpt({ inlineControls: true }, SHORT_DIV);
      const expandLink = findInlineControl(element[0]);
      assert.notOk(expandLink);
    });

    it('toggles the expanded state when clicked', () => {
      const wrapper = renderExcerpt({ inlineControls: true }, TALL_DIV);
      fakeOverflowMonitor.ctrl.onOverflowChanged(true);
      const expandLink = findInlineControl(element[0]);
      angular.element(expandLink.querySelector('a')).click();
      element.scope.$digest();
      const collapseLink = findInlineControl(element[0]);
      assert.equal(collapseLink.querySelector('a').textContent, 'Less');
    });
  });

  describe('bottom area', () => {
    it('expands the excerpt when clicking at the bottom if collapsed', () => {
      const wrapper = renderExcerpt({ inlineControls: true }, TALL_DIV);
      element.scope.$digest();
      assert.isTrue(element.ctrl.collapse);
      const bottomArea = wrapper.find('.excerpt__shadow');
      bottomArea.simulateEvent('click');
      assert.isFalse(element.ctrl.collapse);
    });
  });

  describe('#onCollapsibleChanged', () => {
    it('is called when overflow state changes', () => {
      const callback = sinon.stub();
      renderExcerpt(
        {
          onCollapsibleChanged: {
            args: ['collapsible'],
            callback: callback,
          },
        },
        <span />
      );
      fakeOverflowMonitor.ctrl.onOverflowChanged(true);
      assert.calledWith(callback, true);
      fakeOverflowMonitor.ctrl.onOverflowChanged(false);
      assert.calledWith(callback, false);
    });
  });
});
