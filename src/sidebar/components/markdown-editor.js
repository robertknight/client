'use strict';

const classnames = require('classnames');
const { createElement } = require('preact');
const { useEffect, useRef, useState } = require('preact/hooks');
const propTypes = require('prop-types');

const AutocompleteInput = require('./autocomplete-input');
const MarkdownView = require('./markdown-view');

const {
  LinkType,
  convertSelectionToLink,
  toggleBlockStyle,
  toggleSpanStyle,
} = require('../markdown-commands');

// Mapping of toolbar command name to key for Ctrl+<key> keyboard shortcuts.
// The shortcuts are taken from Stack Overflow's editor.
const SHORTCUT_KEYS = {
  bold: 'b',
  italic: 'i',
  link: 'l',
  quote: 'q',
  image: 'g',
  numlist: 'o',
  list: 'u',
};

/**
 * Apply a toolbar command to an editor input field.
 *
 * @param {string} command
 * @param {HTMLInputElement} inputEl
 */
function handleToolbarCommand(command, inputEl) {
  const update = newStateFn => {
    // Apply the toolbar command to the current state of the input field.
    const newState = newStateFn({
      text: inputEl.value,
      selectionStart: inputEl.selectionStart,
      selectionEnd: inputEl.selectionEnd,
    });

    // Update the input field to match the new state.
    inputEl.value = newState.text;
    inputEl.selectionStart = newState.selectionStart;
    inputEl.selectionEnd = newState.selectionEnd;

    // Restore input field focus which is lost when its contents are changed.
    inputEl.focus();
  };

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
      update(state => toggleSpanStyle(state, '**', '**', 'Bold'));
      break;
    case 'italic':
      update(state => toggleSpanStyle(state, '*', '*', 'Italic'));
      break;
    case 'quote':
      update(state => toggleBlockStyle(state, '> '));
      break;
    case 'link':
      update(state => convertSelectionToLink(state));
      break;
    case 'image':
      update(state => convertSelectionToLink(state, LinkType.IMAGE_LINK));
      break;
    case 'math':
      update(insertMath);
      break;
    case 'numlist':
      update(state => toggleBlockStyle(state, '1. '));
      break;
    case 'list':
      update(state => toggleBlockStyle(state, '* '));
      break;
    default:
      throw new Error(`Unknown toolbar command "${command}"`);
  }
}

function ToolbarButton({
  disabled = false,
  icon,
  label = null,
  onClick,
  shortcutKey,
  title,
}) {
  let tooltip = title;
  if (shortcutKey) {
    tooltip += ` (Ctrl+${shortcutKey.toUpperCase()})`;
  }

  return (
    <button
      className={classnames(
        'markdown-editor__toolbar-button',
        icon && `h-icon-${icon}`,
        label && 'is-text'
      )}
      disabled={disabled}
      onClick={onClick}
      title={tooltip}
    >
      {label}
    </button>
  );
}

ToolbarButton.propTypes = {
  disabled: propTypes.bool,
  icon: propTypes.string,
  label: propTypes.string,
  onClick: propTypes.func,
  shortcutKey: propTypes.string,
  title: propTypes.string,
};

function Toolbar({ isPreviewing, onCommand, onTogglePreview }) {
  return (
    <div
      className="markdown-editor__toolbar"
      role="toolbar"
      aria-label="Markdown editor toolbar"
    >
      <ToolbarButton
        disabled={isPreviewing}
        icon="format-bold"
        onClick={() => onCommand('bold')}
        shortcutKey={SHORTCUT_KEYS.bold}
        title="Bold"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon="format-italic"
        onClick={() => onCommand('italic')}
        shortcutKey={SHORTCUT_KEYS.italic}
        title="Italic"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon="format-quote"
        onClick={() => onCommand('quote')}
        shortcutKey={SHORTCUT_KEYS.quote}
        title="Quote"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon="link"
        onClick={() => onCommand('link')}
        shortcutKey={SHORTCUT_KEYS.link}
        title="Insert link"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon="insert-photo"
        onClick={() => onCommand('image')}
        shortcutKey={SHORTCUT_KEYS.image}
        title="Insert image"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon="functions"
        onClick={() => onCommand('math')}
        title="Insert math (LaTeX is supported)"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon="format-list-numbered"
        onClick={() => onCommand('numlist')}
        shortcutKey={SHORTCUT_KEYS.numlist}
        title="Numbered list"
      />
      <ToolbarButton
        disabled={isPreviewing}
        icon="format-list-bulleted"
        onClick={() => onCommand('list')}
        shortcutKey={SHORTCUT_KEYS.list}
        title="Bulleted list"
      />
      <span className="u-stretch" />
      <ToolbarButton
        label={isPreviewing ? 'Write' : 'Preview'}
        onClick={onTogglePreview}
      />
    </div>
  );
}

Toolbar.propTypes = {
  /** `true` if the editor's "Preview" mode is active. */
  isPreviewing: propTypes.bool,

  /** Callback invoked with the selected command when a toolbar button is clicked. */
  onCommand: propTypes.func,

  /** Callback invoked when the "Preview" toggle button is clicked. */
  onTogglePreview: propTypes.func,
};

// Fixed list of tags for our autocomplete demo.
const tags = [
  'read-later',
  'accepted',
  'rejected',
  'flagged',
];

/**
 * Viewer/editor for the body of an annotation in markdown format.
 */
function MarkdownEditor({ onEditText = () => {}, text = '' }) {
  /** Whether the preview mode is currently active. */
  const [preview, setPreview] = useState(false);

  /** The input element where the user inputs their comment. */
  const input = useRef(null);

  useEffect(() => {
    if (!preview) {
      input.current.focus();
    }
  }, [preview]);

  const togglePreview = () => setPreview(!preview);
  const handleCommand = command => {
    const inputEl = input.current;
    handleToolbarCommand(command, inputEl);
    onEditText({ text: inputEl.value });
  };

  const handleKeyDown = event => {
    if (!event.ctrlKey) {
      return;
    }

    for (let [command, key] of Object.entries(SHORTCUT_KEYS)) {
      if (key === event.key) {
        event.stopPropagation();
        event.preventDefault();
        handleCommand(command);
      }
    }
  };

  return (
    <div>
      <Toolbar
        onCommand={handleCommand}
        isPreviewing={preview}
        onTogglePreview={togglePreview}
      />
      {preview ? (
        <MarkdownView
          textClass={{ 'markdown-editor__preview': true }}
          markdown={text}
        />
      ) : (
        <textarea
          className="form-input form-textarea"
          ref={input}
          onClick={e => e.stopPropagation()}
          onKeydown={handleKeyDown}
          onInput={e => onEditText({ text: e.target.value })}
          value={text}
        />
      )}
      {/* Autocomplete demo using react-autosuggest */}
      <AutocompleteInput candidates={tags}/>
    </div>
  );
}

MarkdownEditor.propTypes = {
  /** The markdown text to edit. */
  text: propTypes.string,

  /**
   * Callback invoked with `{ text }` object when user edits text.
   *
   * TODO: Simplify this callback to take just a string rather than an object
   * once the parent component is converted to Preact.
   */
  onEditText: propTypes.func,
};

module.exports = MarkdownEditor;
