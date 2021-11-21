import approxSearch from 'approx-string-match';

/**
 * @typedef {import('approx-string-match').Match} StringMatch
 */

/**
 * @typedef Match
 * @prop {number} start - Start offset of match in text
 * @prop {number} end - End offset of match in text
 * @prop {number} score -
 *   Score for the match between 0 and 1.0, where 1.0 indicates a perfect match
 *   for the quote and context.
 */

/**
 * Find the best approximate matches for `str` in `text` allowing up to `maxErrors` errors.
 *
 * @param {string} text
 * @param {string} str
 * @param {number} maxErrors
 * @return {StringMatch[]}
 */
function search(text, str, maxErrors) {
  // Do a fast search for exact matches. The `approx-string-match` library
  // doesn't currently incorporate this optimization itself.
  let matchPos = 0;
  const exactMatches = [];
  while (matchPos !== -1) {
    matchPos = text.indexOf(str, matchPos);
    if (matchPos !== -1) {
      exactMatches.push({
        start: matchPos,
        end: matchPos + str.length,
        errors: 0,
      });
      matchPos += 1;
    }
  }
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // If there are no exact matches, do a more expensive search for matches
  // with errors.
  return approxSearch(text, str, maxErrors);
}

/**
 * Find the best approximate match for `quote` in `text`.
 *
 * Returns `null` if no match exceeding the minimum quality threshold was found.
 *
 * @param {string} text - Document text to search
 * @param {string} quote - String to find within `text`
 * @param {object} context -
 *   Context in which the quote originally appeared. This is used to choose the
 *   best match.
 *   @param {string} [context.prefix] - Expected text before the quote
 *   @param {string} [context.suffix] - Expected text after the quote
 *   @param {number} [context.hint] - Expected offset of match within text
 * @return {Match|null}
 */
export function matchQuote(text, quote, context = {}) {
  if (quote.length === 0) {
    return null;
  }

  // Choose the maximum number of errors to allow for the initial search.
  // This choice involves a tradeoff between:
  //
  //  - Recall (proportion of "good" matches found)
  //  - Precision (proportion of matches found which are "good")
  //  - Cost of the initial search and of processing the candidate matches [1]
  //
  // [1] Specifically, the expected-time complexity of the initial search is
  //     `O((maxErrors / 32) * text.length)`. See `approx-string-match` docs.
  const maxErrors = Math.min(256, quote.length / 2);

  const prefix = context.prefix ?? '';
  const suffix = context.suffix ?? '';

  const maxContextErrors = maxErrors + prefix.length + suffix.length;
  const quoteInContext = prefix + quote + suffix;
  const matches = search(text, quoteInContext, maxContextErrors);

  let bestMatch = null;
  for (let qicMatch of matches) {
    const matchText = text.slice(qicMatch.start, qicMatch.end);
    const quoteMatches = search(matchText, quote, maxErrors);
    if (quoteMatches.length === 0) {
      // We may fail to find a quote match if the best match for the quote in
      // context doesn't include the quote at all.
      continue;
    }

    const quoteMatch = quoteMatches[0];

    const start = qicMatch.start + quoteMatch.start;

    const contextScore =
      maxContextErrors > 0 ? 1.0 - qicMatch.errors / maxContextErrors : 0;
    const quoteScore = maxErrors > 0 ? 1.0 - quoteMatch.errors / maxErrors : 0;

    let posScore = 1.0;
    if (typeof context.hint === 'number') {
      const offset = Math.abs(start - context.hint);
      posScore = 1.0 - offset / text.length;
    }
    const score = contextScore + quoteScore + posScore;

    const match = {
      start,
      end: qicMatch.start + quoteMatch.end,
      score,
    };
    if (!bestMatch || match.score > bestMatch.score) {
      bestMatch = match;
    }
  }
  return bestMatch;
}
