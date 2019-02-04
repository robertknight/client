'use strict';

const proxyquire = require('proxyquire');
const { mount } = require('enzyme');
const { createElement } = require('preact');

const Timestamp = require('../timestamp-react');

describe('Timestamp', () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('renders plain text if no link is supplied', () => {
    const timestamp = new Date().toISOString();
    const wrapper = mount(<Timestamp timestamp={timestamp} />);
    assert.equal(wrapper.find('span').length, 1);
    assert.equal(wrapper.find('a').length, 0);
  });

  it('renders a link if a link is supplied', () => {
    const href = 'https://hyp.is/a/123';
    const timestamp = new Date().toISOString();
    const wrapper = mount(<Timestamp timestamp={timestamp} href={href} />);

    const linkEl = wrapper.find('a');
    assert.equal(linkEl.length, 1);
    assert.equal(linkEl.props().href, href);
  });

  it('renders "Just now" if the timestamp is very recent', () => {
    const timestamp = new Date().toISOString();
    const wrapper = mount(<Timestamp timestamp={timestamp} />);
    assert.equal(wrapper.text(), 'Just now');
  });

  it('renders an age if the timestamp is quite recent', () => {
    const timestamp = new Date().toISOString();
    clock.tick(60 * 1000);
    const wrapper = mount(<Timestamp timestamp={timestamp} />);
    assert.equal(wrapper.text(), '1 min');
  });

  it('updates the timestamp automatically', () => {
    const ageInMillis = timestamp => Date.now() - +new Date(timestamp);
    const fakeTimeUtil = {
      toFuzzyString: ageInMillis,
      decayingInterval: sinon.stub(),
    };
    const Timestamp = proxyquire('../timestamp-react', {
      '../util/time': fakeTimeUtil,

      preact: require('preact'),
    });
    const timestamp = new Date().toISOString();
    const wrapper = mount(<Timestamp timestamp={timestamp} />);

    clock.tick(60 * 1000);
    const [refreshTimestamp, callback] = fakeTimeUtil.decayingInterval.getCall(
      0
    ).args;
    assert.equal(refreshTimestamp, timestamp);

    assert.equal(wrapper.text(), '0');

    // Simulate `decayingInterval` triggering a refresh.
    callback();
    wrapper.instance().forceUpdate();

    assert.equal(wrapper.text(), '60000');
  });
});
