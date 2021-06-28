import { LocationObserver } from '../location-observer';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('LocationObserver', () => {
  let frame;
  let observer;
  let testWindow;

  beforeEach(async () => {
    frame = document.createElement('iframe');
    frame.src = '/dummy-url';
    document.body.appendChild(frame);
    testWindow = frame.contentWindow;

    // Wait for the initial page load to complete. This is needed because calling
    // `pushState` to change the URL will fail if the iframe's document is
    // on a different site (`about:blank`) than the URL we are attempting to set.
    while (testWindow.location.href === 'about:blank') {
      await delay(1);
    }
  });

  afterEach(() => {
    observer.disconnect();
    frame.remove();
  });

  it('invokes callback when client-side route updates occur', () => {
    const stub = sinon.stub();
    observer = new LocationObserver(stub, testWindow);

    testWindow.history.pushState({}, '', '/test-url');

    assert.equal(testWindow.location.pathname, '/test-url');
    assert.calledWith(stub, testWindow.location.href);
  });

  it('invokes callback when Back/Forward navigations occur', async () => {
    const stub = sinon.stub();
    observer = new LocationObserver(stub, testWindow);

    testWindow.history.pushState({}, '', '/test-url');
    stub.resetHistory();

    testWindow.history.back();
    await delay(0); // Wait for "popstate" event to be delivered
    assert.calledWith(stub, testWindow.location.href);
    stub.resetHistory();

    testWindow.history.forward();
    await delay(0); // Wait for "popstate" event to be delivered
    assert.calledWith(stub, testWindow.location.href);
  });

  it('stops reporting navigations after `disconnect` is called', () => {
    const stub = sinon.stub();
    observer = new LocationObserver(stub, testWindow);

    observer.disconnect();
    testWindow.history.pushState({}, '', '/test-url');

    assert.equal(testWindow.location.pathname, '/test-url');
    assert.notCalled(stub);
  });

  it('un-patches history.{pushState, replaceState} when `disconnect` is called', () => {
    const origPushState = testWindow.history.pushState;
    const origReplaceState = testWindow.history.replaceState;

    const stub = sinon.stub();
    observer = new LocationObserver(stub, testWindow);

    assert.notEqual(testWindow.history.pushState, origPushState);
    assert.notEqual(testWindow.history.replaceState, origReplaceState);

    observer.disconnect();

    assert.equal(testWindow.history.pushState, origPushState);
    assert.equal(testWindow.history.replaceState, origReplaceState);
  });
});
