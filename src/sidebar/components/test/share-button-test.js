'use strict';

const { mount } = require('enzyme');
const { createElement } = require('preact');

const ShareButton = require('../share-button');

describe('ShareButton', () => {
  [
    {
      type: 'twitter',
      link: /twitter.com/,
      title: 'Tweet link',
    },
    {
      type: 'facebook',
      link: /facebook.com/,
      title: 'Share on Facebook',
    },
    {
      type: 'email',
      link: /mailto:/,
      title: 'Share via email',
    },
  ].forEach(({ type, link, title }) => {
    it(`renders "${type}" share button`, () => {
      const url = 'http://example.com';
      const wrapper = mount(<ShareButton url={url} type={type} />);
      const linkEl = wrapper.find('a');
      assert.equal(linkEl.props().title, title);
      assert.match(linkEl.props().href, link);
      assert.include(linkEl.props().href, encodeURIComponent(url));
    });
  });

  ['twitter', 'facebook', 'email'].forEach(type => {
    it('invokes callback on click', () => {
      const onClick = sinon.stub();
      const wrapper = mount(
        <ShareButton url="http://example.com" type={type} onClick={onClick} />
      );
      wrapper.find('a').simulate('click');
      assert.calledWith(onClick, type);
    });
  });
});
