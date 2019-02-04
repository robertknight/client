'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const ShareDialog = require('../share-dialog-react');

describe('ShareDialog', () => {
  let fakeAnalytics;
  let fakeStore;

  beforeEach(() => {
    fakeStore = {
      frames: () => [{ uri: 'https://example.com' }],
    };
    fakeAnalytics = {
      events: {
        DOCUMENT_SHARED: 'documentShared',
      },
      track: sinon.stub(),
    };
  });

  function render() {
    const el = <ShareDialog store={fakeStore} analytics={fakeAnalytics} />;
    return shallow(el);
  }

  it('renders three share buttons', () => {
    const url = 'https://example.com';
    fakeStore.frames = () => [{ uri: url }];
    const wrapper = render();
    const btns = wrapper.find('ShareButton');
    assert.equal(btns.length, 3);

    const expectedUrl = `https://hyp.is/go?url=${encodeURIComponent(url)}`;
    const shareTypes = ['twitter', 'facebook', 'email'];
    shareTypes.forEach((type, index) => {
      assert.match(btns.get(index).props, {
        type,
        url: expectedUrl,
      });
    });
  });

  it('tracks share button clicks', () => {
    const wrapper = render();
    const btns = wrapper.find('ShareButton');
    const shareTypes = ['twitter', 'facebook', 'email'];
    shareTypes.forEach((type, index) => {
      const { onClick } = btns.get(index).props;
      onClick(type);
      assert.calledWith(fakeAnalytics.track, 'documentShared', type);
      fakeAnalytics.track.reset();
    });
  });
});
