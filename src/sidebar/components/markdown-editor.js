'use strict';

const { html, Component } = require('htm/preact');

const renderMathAndMarkdown = require('../render-markdown');
const createCustomElement = require('../util/preact-custom-element');

function ToolbarButton({ icon, onClick, title }) {
  const iconClass = `h-icon-format-${icon} markdown-tools-button`;
  return html`<i class=${iconClass} onClick=${onClick} title=${title}></i>`;
}

class MarkdownEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      preview: false,
      rendered: '',
    };
  }

  componentWillMount() {
    this._renderMarkdown();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.text !== this.props.text) {
      this._renderMarkdown();
    }
  }

  _renderMarkdown() {
    // TODO - Use an HTML sanitization library here.
    const sanitize = html => html;
    this.setState({ rendered: renderMathAndMarkdown(this.props.text, sanitize) });
  }

  render({ readOnly, onEditText }) {
    if (readOnly) {
      const markup = { __html: this.state.rendered };
      return html`<div dangerouslySetInnerHTML=${markup}></div>`;
    }

    function onInput(event) {
      event.stopPropagation();
      onEditText(event.target.value);
    }

    const togglePreview = () => this.setState({ preview: !this.state.preview });

    const insertBold = () => {};
    const insertItalic = () => {};
    const insertQuote =  () => {};
    const insertLink = () => {};
    const insertIMG = () => {};
    const insertMath = () => {};
    const insertNumList = () => {};
    const insertList = () => {};

    return html`<span>
      <div class="markdown-tools">
        <span class="markdown-preview-toggle">
          <a class="markdown-tools-badge h-icon-markdown" href="https://help.github.com/articles/markdown-basics" title="Parsed as Markdown" target="_blank"></a>
          <a href="" class="markdown-tools-toggle" onClick=${togglePreview}
            ng-show="!vm.preview">${this.state.preview ? 'Write' : 'Preview'}</a>
        </span>
        <${ToolbarButton} onClick=${insertBold} icon="bold" title="Embolden text" />
        <${ToolbarButton} onClick=${insertItalic} icon="italic" title="Italicize text" />
        <${ToolbarButton} onClick=${insertQuote} icon="quote"  title="Quote text" />
        <${ToolbarButton} onClick=${insertLink} icon="link" title="Insert link" />
        <${ToolbarButton} onClick=${insertIMG} icon="photo" title="Insert image" />
        <${ToolbarButton} onClick=${insertMath} icon="functions" title="Insert mathematical notation (LaTeX is supported)" />
        <${ToolbarButton} onClick=${insertNumList} icon="format-list-numbered" title="Insert numbered list" />
        <${ToolbarButton} onClick=${insertList} icon="format-list-bulleted" title="Insert list" />
      </div>
      <textarea class="form-input form-textarea js-markdown-input"
                h-branding="annotationFontFamily"
                onInput=${onInput}>${this.props.text}</textarea>
      <div class="markdown-body js-markdown-preview"
           ng-class="(vm.preview && 'markdown-preview') || vm.customTextClass"
           ng-dblclick="vm.togglePreview()"
           ng-show="!vm.showEditor()"
           h-branding="annotationFontFamily">
      </div>
    </span>`;
  }
}

module.exports = createCustomElement(MarkdownEditor, {
  properties: {
    readOnly: {
      initialValue: true,
    },
    text: {
      initialValue: '',
    },
  },
  events: [
    'editText',
  ],
});
