'use strict';

const { createElement } = require('preact');
const { act } = require('preact/test-utils');
const { mount } = require('enzyme');

const Excerpt = require('../excerpt');

describe('Excerpt', () => {
  const SHORT_DIV = <div id="foo" style="height: 5px;" />;
  const TALL_DIV = (
    <div id="foo" style="height: 200px;">
      foo bar
    </div>
  );
  const DEFAULT_CONTENT = <span className="the-content">default content</span>;

  let container;
  let fakeObserveElementSize;

  function createExcerpt(props = {}, content = DEFAULT_CONTENT) {
    return mount(
      <Excerpt
        collapse={true}
        collapsedHeight={40}
        inlineControls={false}
        {...props}
      >
        {content}
      </Excerpt>,
      { attachTo: container }
    );
  }

  beforeEach(() => {
    fakeObserveElementSize = sinon.stub();
    container = document.createElement('div');
    document.body.appendChild(container);

    Excerpt.$imports.$mock({
      '../util/observe-element-size': fakeObserveElementSize,
    });
  });

  afterEach(() => {
    container.remove();
  });

  function getExcerptHeight(wrapper) {
    return wrapper.find('.excerpt').prop('style')['max-height'];
  }

  it('renders content in container', () => {
    const wrapper = createExcerpt();
    const contentEl = wrapper.find('[test-name="excerpt-content"]');
    assert.include(contentEl.html(), 'default content');
  });

  it('truncates content if it exceeds `collapsedHeight` + `overflowHysteresis`', () => {
    const wrapper = createExcerpt({}, TALL_DIV);
    assert.equal(getExcerptHeight(wrapper), 40);
  });

  it('does not truncate content if it does not exceed `collapsedHeight` + `overflowHysteresis`', () => {
    const wrapper = createExcerpt({}, SHORT_DIV);
    assert.equal(getExcerptHeight(wrapper), 5);
  });

  it('updates the collapsed state when the content height changes', () => {
    const wrapper = createExcerpt({}, SHORT_DIV);
    assert.called(fakeObserveElementSize);

    const contentElem = fakeObserveElementSize.getCall(0).args[0];
    const sizeChangedCallback = fakeObserveElementSize.getCall(0).args[1];
    act(() => {
      contentElem.style.height = '400px';
      sizeChangedCallback();
    });
    wrapper.update();

    assert.equal(getExcerptHeight(wrapper), 40);

    act(() => {
      contentElem.style.height = '10px';
      sizeChangedCallback();
    });
    wrapper.update();

    assert.equal(getExcerptHeight(wrapper), 10);
  });

  it('calls `onCollapsibleChanged` when collapsibility changes', () => {
    const onCollapsibleChanged = sinon.stub();
    createExcerpt({ onCollapsibleChanged }, SHORT_DIV);

    const contentElem = fakeObserveElementSize.getCall(0).args[0];
    const sizeChangedCallback = fakeObserveElementSize.getCall(0).args[1];
    act(() => {
      contentElem.style.height = '400px';
      sizeChangedCallback();
    });

    assert.calledWith(onCollapsibleChanged, { collapsible: true });
  });

  it('calls `onToggleCollapsed` when user clicks in bottom area to expand excerpt', () => {
    const onToggleCollapsed = sinon.stub();
    const wrapper = createExcerpt({ onToggleCollapsed }, TALL_DIV);
    const control = wrapper.find('.excerpt__shadow');
    assert.equal(getExcerptHeight(wrapper), 40);
    control.simulate('click');
    assert.called(onToggleCollapsed);
  });

  context('when inline controls are enabled', () => {
    it('displays inline controls if collapsed', () => {
      const wrapper = createExcerpt({ inlineControls: true }, TALL_DIV);
      assert.isTrue(wrapper.exists('.excerpt__inline-controls'));
    });

    it('does not display inline controls if not collapsed', () => {
      const wrapper = createExcerpt({ inlineControls: true }, SHORT_DIV);
      assert.isFalse(wrapper.exists('.excerpt__inline-controls'));
    });

    it('toggles the expanded state when clicked', () => {
      const wrapper = createExcerpt({ inlineControls: true }, TALL_DIV);
      const control = wrapper.find('.excerpt__inline-controls a');
      assert.equal(getExcerptHeight(wrapper), 40);
      control.simulate('click');
      assert.equal(getExcerptHeight(wrapper), 200);
    });
  });
});
