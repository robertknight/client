'use strict';

const proxyquire = require('proxyquire');
const { createElement } = require('preact');
const { mount } = require('enzyme');

describe('MarkdownView', () => {
  let fakeMediaEmbedder;
  let fakeRenderMarkdown;
  let MarkdownView;

  before(() => {
    fakeRenderMarkdown = markdown => `rendered:${markdown}`;
    fakeMediaEmbedder = {
      replaceLinksWithEmbeds: el => {
        // Tag the element as having been processed
        el.dataset.replacedLinksWithEmbeds = 'yes';
      },
    };

    MarkdownView = proxyquire('../markdown-view', {
      '../render-markdown': fakeRenderMarkdown,
      '../media-embedder': fakeMediaEmbedder,

      preact: require('preact'),
      shallowequal: require('shallowequal'),
    });
  });

  it('renders nothing if no markdown is provied', () => {
    const wrapper = mount(<MarkdownView />);
    assert.equal(wrapper.text(), '');
  });

  it('renders markdown as HTML', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    const rendered = wrapper.find('.markdown-body').getDOMNode();
    assert.equal(rendered.innerHTML, 'rendered:**test**');
  });

  it('re-renders markdown after an update', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    wrapper.setProps({ markdown: '_updated_' });
    const rendered = wrapper.find('.markdown-body').getDOMNode();
    assert.equal(rendered.innerHTML, 'rendered:_updated_');
  });

  it('replaces links with embeds in rendered output', () => {
    const wrapper = mount(<MarkdownView markdown="**test**" />);
    const rendered = wrapper.find('.markdown-body').getDOMNode();
    assert.equal(rendered.dataset.replacedLinksWithEmbeds, 'yes');
  });

  it('applies `textClass` class to container', () => {
    const wrapper = mount(
      <MarkdownView markdown="foo" textClass="fancy-effect" />
    );
    assert.isTrue(wrapper.find('.markdown-body.fancy-effect').exists());
  });
});
