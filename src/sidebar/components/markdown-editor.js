'use strict';

const { Component, createRef, createElement } = require('preact');
const propTypes = require('prop-types');
const shallowEqual = require('shallowequal');

const MarkdownView = require('./markdown-view');
const commands = require('../markdown-commands');

// eslint-disable-next-line react/prop-types
function ToolbarButton({ command, icon, onCommand, title }) {
  const onClick = () => onCommand(command);
  return (
    <i
      className={`markdown-tools-button h-icon-${icon}`}
      onClick={onClick}
      title={title}
    />
  );
}

/**
 * The command toolbar above the edit field of an annotation.
 */
// eslint-disable-next-line react/prop-types
function Toolbar({ isPreviewing, onCommand, onTogglePreview }) {
  return (
    <div className="markdown-tools">
      <span className="markdown-preview-toggle">
        <a href="#" className="markdown-tools-toggle" onClick={onTogglePreview}>
          {isPreviewing ? 'Write' : 'Preview'}
        </a>
      </span>
      <ToolbarButton
        command="bold"
        icon="format-bold"
        onCommand={onCommand}
        title="Embolden text"
      />
      <ToolbarButton
        command="italic"
        icon="format-italic"
        onCommand={onCommand}
        title="Italicize text"
      />
      <ToolbarButton
        command="quote"
        icon="format-quote"
        onCommand={onCommand}
        title="Quote text"
      />
      <ToolbarButton
        command="link"
        icon="link"
        onCommand={onCommand}
        title="Insert link"
      />
      <ToolbarButton
        command="image"
        icon="insert-photo"
        onCommand={onCommand}
        title="Insert image"
      />
      <ToolbarButton
        command="math"
        icon="functions"
        onCommand={onCommand}
        title="Insert math (LaTeX is supported)"
      />
      <ToolbarButton
        command="numlist"
        icon="format-list-numbered"
        onCommand={onCommand}
        title="Insert numbered list"
      />
      <ToolbarButton
        command="list"
        icon="format-list-bulleted"
        onCommand={onCommand}
        title="Insert list"
      />
    </div>
  );
}

class MarkdownEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      preview: false,
    };
    this._input = createRef();
    this._onCommand = this._onCommand.bind(this);
    this._togglePreview = this._togglePreview.bind(this);
  }

  // eslint-disable-next-line react/no-deprecated
  componentWillReceiveProps({ readOnly }) {
    if (readOnly !== this.props.readOnly && readOnly) {
      this.setState({ preview: false });
    }
  }

  componentDidMount() {
    if (this._input.current) {
      this._input.current.focus();
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      !shallowEqual(this.props, nextProps) ||
      !shallowEqual(this.state, nextState)
    );
  }

  render() {
    const { text, customTextClass, onEditText, readOnly } = this.props;
    const { preview } = this.state;

    if (readOnly) {
      return <MarkdownView textClass={customTextClass} markdown={text} />;
    }

    const showEditor = !preview;

    return (
      <div>
        <Toolbar
          onCommand={this._onCommand}
          isPreviewing={preview}
          onTogglePreview={this._togglePreview}
        />
        {showEditor && (
          <textarea
            className="form-input form-textarea"
            ref={this._input}
            onClick={e => e.stopPropagation()}
            onInput={e => onEditText({ text: e.target.value })}
            value={text}
          />
        )}
        {!showEditor && (
          <MarkdownView
            textClass={{ 'markdown-preview': true }}
            markdown={text}
          />
        )}
      </div>
    );
  }

  /**
   * Handle an editor toolbar command.
   */
  _onCommand(command) {
    const input = this._input.current;
    const update = newStateFn => {
      // Apply the toolbar command to the current state of the input field.
      const newState = newStateFn({
        text: input.value,
        selectionStart: input.selectionStart,
        selectionEnd: input.selectionEnd,
      });

      // Update the input field to match the new state.
      input.value = newState.text;
      input.selectionStart = newState.selectionStart;
      input.selectionEnd = newState.selectionEnd;

      // Restore input field focus which is lost when its contents are changed.
      input.focus();

      this.props.onEditText({ text: input.value });
    };
    const {
      convertSelectionToLink,
      toggleBlockStyle,
      toggleSpanStyle,
    } = commands;
    const { IMAGE_LINK } = commands.LinkType;

    const insertMath = state => {
      const before = state.text.slice(0, state.selectionStart);
      if (
        before.length === 0 ||
        before.slice(-1) === '\n' ||
        before.slice(-2) === '$$'
      ) {
        return toggleSpanStyle(state, '$$', '$$', 'Insert LaTeX');
      } else {
        return toggleSpanStyle(state, '\\(', '\\)', 'Insert LaTeX');
      }
    };

    switch (command) {
      case 'bold':
        return update(state => toggleSpanStyle(state, '**', '**', 'Bold'));
      case 'italic':
        return update(state => toggleSpanStyle(state, '*', '*', 'Italic'));
      case 'quote':
        return update(state => toggleBlockStyle(state, '> '));
      case 'link':
        return update(state => convertSelectionToLink(state));
      case 'image':
        return update(state => convertSelectionToLink(state, IMAGE_LINK));
      case 'math':
        return update(insertMath);
      case 'numlist':
        return update(state => toggleBlockStyle(state, '1. '));
      case 'list':
        return update(state => toggleBlockStyle(state, '* '));
      default:
        throw new Error(`Unknown command "${command}"`);
    }
  }

  _togglePreview() {
    this.setState(state => ({ preview: !state.preview }));
  }
}

MarkdownEditor.propTypes = {
  /** The markdown to render. */
  text: propTypes.string,

  /** `true` if this component is in viewing mode, false in `editing` mode. */
  readOnly: propTypes.bool,

  /** Callback invoked with `{ text }` object when user edits text. */
  onEditText: propTypes.func,

  /**
   * A CSS classname-to-boolean map of classes to apply to the markdown
   * container.
   */
  customTextClass: propTypes.object,
};

module.exports = MarkdownEditor;
