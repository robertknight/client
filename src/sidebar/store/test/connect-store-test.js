'use strict';

const { mount } = require('enzyme');
const { createStore } = require('redux');
const { createElement, options } = require('preact');

const { withPropsFromStore } = require('../connect-store');

const initialState = { value: 10, otherValue: 20 };
const reducer = (state = initialState, action) => {
  if (action.type === 'INCREMENT') {
    return { ...state, value: state.value + 1 };
  } else if (action.type === 'INCREMENT_OTHER') {
    return { ...state, otherValue: state.otherValue + 1 };
  } else {
    return state;
  }
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('withPropsFromStore', () => {
  const TestComponent = sinon.stub().returns(null);
  TestComponent.propTypes = {};
  TestComponent.displayName = 'TestComponent';
  TestComponent.injectedProps = ['someAngularService'];

  const WrappedComponent = withPropsFromStore(TestComponent, store => ({
    fromStore: store.getState().value,
  }));

  let store;

  // Preact internally uses `requestAnimationFrame` to debounce updates.
  // Speed up tests by replacing this with a function that runs its
  // callback sooner.
  const originalRAF = options.requestAnimationFrame;
  before(() => {
    options.requestAnimationFrame = cb => setTimeout(cb, 0);
  });
  after(() => {
    options.requestAnimationFrame = originalRAF;
  });

  beforeEach(() => {
    store = createStore(reducer);
    TestComponent.reset();
  });

  it('extracts state and passes it to the component', () => {
    const wrapper = mount(<WrappedComponent store={store} />);
    assert.equal(wrapper.find(TestComponent).prop('fromStore'), 10);
    wrapper.unmount();
  });

  it('sets the display name of the wrapper', () => {
    assert.equal(WrappedComponent.displayName, 'withStoreState(TestComponent)');
  });

  it('sets the injected props of the wrapper', () => {
    assert.deepEqual(WrappedComponent.injectedProps, [
      'store',
      'someAngularService',
    ]);
  });

  it('passes along other props', () => {
    const wrapper = mount(<WrappedComponent store={store} fromParent="foo" />);
    assert.equal(wrapper.find(TestComponent).prop('fromParent'), 'foo');
    wrapper.unmount();
  });

  it('re-renders when store updates and extracted state changes', async () => {
    const wrapper = mount(<WrappedComponent store={store} />);

    // Trigger an update and wait for re-render.
    store.dispatch({ type: 'INCREMENT' });
    await delay(0);

    // Check that component was re-rendered.
    assert.calledWithMatch(TestComponent, { fromStore: 11 });

    // Trigger another update and wait for re-render.
    store.dispatch({ type: 'INCREMENT' });
    await delay(0);

    // Check that component was re-rendered again.
    assert.calledWithMatch(TestComponent, { fromStore: 12 });

    wrapper.unmount();
  });

  it('does not re-render if store updates but extracted state did not change', async () => {
    const wrapper = mount(<WrappedComponent store={store} />);

    // Trigger an update and wait for re-render.
    store.dispatch({ type: 'INCREMENT_OTHER' });
    await delay(0);

    // Check that no re-render happened.
    assert.calledOnce(TestComponent);

    wrapper.unmount();
  });
});
