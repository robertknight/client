'use strict';

const proxyquire = require('proxyquire');
const { createElement, render } = require('preact');
const { mount, shallow } = require('enzyme');

const { LinkType } = require('../../markdown-commands');
const MarkdownView = require('../markdown-view');

function mockFormattingCommand() {
  return {
    text: 'formatted text',
    selectionStart: 0,
    selectionEnd: 0,
  };
}

describe('MarkdownEditor', () => {
  let fakeMarkdownCommands;

  let MarkdownEditor;

  before(() => {
    fakeMarkdownCommands = {
      convertSelectionToLink: mockFormattingCommand,
      toggleBlockStyle: mockFormattingCommand,
      toggleSpanStyle: mockFormattingCommand,
      LinkType,
    };

    MarkdownEditor = proxyquire('../markdown-editor', {
      '../markdown-commands': fakeMarkdownCommands,

      './markdown-view': MarkdownView,
      preact: require('preact'),
    });
  });

  it('shows rendered markdown when `readOnly` is true', () => {
    const wrapper = shallow(<MarkdownEditor text="**test**" readOnly={true} />);
    assert.equal(wrapper.find(MarkdownView).length, 1);
  });

  it('does not show toolbar when `readOnly` is true', () => {
    const wrapper = shallow(<MarkdownEditor text="**test**" readOnly={true} />);
    assert.isFalse(wrapper.exists('Toolbar'));
  });

  it('shows editor when `readOnly` is false', () => {
    const wrapper = shallow(
      <MarkdownEditor text="**test**" readOnly={false} />
    );
    assert.isTrue(wrapper.exists('Toolbar'));
    assert.isTrue(wrapper.exists('textarea'));
    assert.equal(wrapper.find('textarea').props().value, '**test**');
  });

  it('does not show rendered markdown when `readOnly` is false', () => {
    const wrapper = shallow(
      <MarkdownEditor text="**test**" readOnly={false} />
    );
    assert.equal(wrapper.find(MarkdownView).length, 0);
  });

  const commands = [
    'bold',
    'italic',
    'quote',
    'link',
    'image',
    'math',
    'list',
    'numlist',
  ];
  commands.forEach(command => {
    it('applies formatting when toolbar button is clicked', () => {
      const onEditText = sinon.stub();
      const wrapper = mount(
        <MarkdownEditor text="test" readOnly={false} onEditText={onEditText} />
      );
      const button = wrapper.find(`ToolbarButton[command="${command}"] > i`);
      const input = wrapper.find('textarea').getDOMNode();
      input.selectionStart = 0;
      input.selectionEnd = 10;

      button.simulate('click');

      assert.calledWith(onEditText, {
        text: 'formatted text',
      });
    });
  });

  it('calls `onEditText` callback when text is changed', () => {
    const onEditText = sinon.stub();
    const wrapper = mount(
      <MarkdownEditor text="test" readOnly={false} onEditText={onEditText} />
    );
    const input = wrapper.find('textarea').getDOMNode();
    input.value = 'changed';
    wrapper.find('textarea').simulate('input');
    assert.calledWith(onEditText, {
      text: 'changed',
    });
  });

  it('shows preview state when Preview button is clicked', () => {
    const wrapper = mount(<MarkdownEditor text="test" readOnly={false} />);

    wrapper.find('.markdown-tools-toggle').simulate('click');

    assert.isFalse(wrapper.find('textarea').exists());
    assert.isTrue(wrapper.find('MarkdownView').exists());
  });

  it('exits preview mode when Write button is clicked', () => {
    const wrapper = mount(<MarkdownEditor text="test" readOnly={false} />);

    // Switch to "Preview" mode.
    wrapper.find('.markdown-tools-toggle').simulate('click');
    // Switch back to "Write" mode.
    wrapper.find('.markdown-tools-toggle').simulate('click');

    assert.isTrue(wrapper.find('textarea').exists());
    assert.isFalse(wrapper.find('MarkdownView').exists());
  });

  it('exits preview mode when `readOnly` prop changes to `true`', () => {
    const wrapper = mount(<MarkdownEditor text="test" readOnly={false} />);

    // Switch to "Preview" mode.
    wrapper.find('.markdown-tools-toggle').simulate('click');
    // Switch to "read only" mode and then back to editing. We should exit the
    // preview.
    wrapper.setProps({ readOnly: true });
    wrapper.setProps({ readOnly: false });

    assert.isTrue(wrapper.find('textarea').exists());
    assert.isFalse(wrapper.find('MarkdownView').exists());
  });

  it('applies `customTextClass` prop to text container', () => {
    const wrapper = shallow(
      <MarkdownEditor
        text="test"
        readOnly={true}
        customTextClass={{ 'fancy-effect': true }}
      />
    );
    const view = wrapper.find(MarkdownView);
    assert.deepEqual(view.props().textClass, { 'fancy-effect': true });
  });

  it('focuses the input field when created', () => {
    const container = document.createElement('div');
    try {
      document.body.focus();
      document.body.appendChild(container);
      render(<MarkdownEditor text="test" readOnly={false} />, container);

      assert.equal(document.activeElement.nodeName, 'TEXTAREA');
    } finally {
      container.remove();
    }
  });
});
