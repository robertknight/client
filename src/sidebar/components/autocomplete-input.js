'use strict';

const { createElement } = require('preact');
const { useState, useCallback } = require('preact/hooks');
const propTypes = require('prop-types');
const Autosuggest = require('react-autosuggest');

function AutocompleteInput({ candidates }) {
  // Current value of input field.
  const [value, setValue] = useState('');

  // Filter to apply to suggestions.
  const [filter, setFilter] = useState('');

  const onChange = useCallback((e, { newValue }) => setValue(newValue), []);
  const inputProps = {
    placeholder: 'Enter tag',
    value,
    onChange,
  };
  const suggestions = candidates.filter(c =>
    c.toLowerCase().includes(filter.toLowerCase())
  );
  const clearSuggestions = useCallback(() => setFilter(''), []);
  const fetchSuggestions = useCallback(({ value }) => setFilter(value), []);
  const getSuggestionValue = useCallback(value => value, []);
  const renderItem = useCallback(
    (item, { isHighlighted }) => (
      <div>{isHighlighted ? <b>{item}</b> : item}</div>
    ),
    []
  );

  return (
    <Autosuggest
      suggestions={suggestions}
      onSuggestionsFetchRequested={fetchSuggestions}
      onSuggestionsClearRequested={clearSuggestions}
      getSuggestionValue={getSuggestionValue}
      renderSuggestion={renderItem}
      inputProps={inputProps}
    />
  );
}

AutocompleteInput.propTypes = {
  candidates: propTypes.arrayOf(propTypes.string),
};

module.exports = AutocompleteInput;
