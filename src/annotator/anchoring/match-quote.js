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
  let exactMatches = [];
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
 * Compute a score between 0 and 1.0 for the similarity between `text` and `str`.
 *
 * @param {string} text
 * @param {string} str
 */
function textMatchScore(text, str) {
  /* istanbul ignore next - `scoreMatch` will never pass an empty string */
  if (str.length === 0) {
    return 0.0;
  }
  const matches = search(text, str, str.length);
  return 1 - matches[0].errors / str.length;
}

/**
 * Find the best approximate match for `quote` in `text`.
 *
 * Returns `null` if no match exceeding the minimum quality threshold was found.
 *
 * @param {string} text - Document text to search
 * @param {string} quote - String to find within `text`
 * @param {Object} context -
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

  // The cost of `search` is `O((maxErrors / 32) * text.length)`. The maximum
  // number of matches that may be returned and have to be ranked is also
  // proportional to `maxErrors`. Therefore we impose an upper limit.
  const maxErrors = Math.min(256, quote.length / 2);

  // `search` returns the matches for `quote` in `text` with the least errors.
  // These are then ranked based on how closely the surrounding context matches
  // what is expected.
  //
  // TODO - If the quote is short and generic (how could we determine that?) we
  // want to give more weight to the context. See annotations in Public where the quote is
  // "mastodons" on http://www.americanyawp.com/text/01-the-new-world/ for example.
  //
  // The word no longer appears in the text and so a liberal matching of just
  // the quote finds nonsensical matches.
  const matches = search(text, quote, maxErrors);

  if (matches.length === 0) {
    // All matches had more than `maxErrors` errors.
    return null;
  }

  /**
   * Compute a score between 0 and 1.0 for a match.
   *
   * @param {StringMatch} match
   */
  const scoreMatch = match => {
    const quoteWeight = 50; // Similarity of matched text to quote.
    const prefixWeight = 20; // Similarity of text before matched text to `context.prefix`.
    const suffixWeight = 20; // Similarity of text after matched text to `context.suffix`.
    const posWeight = 2; // Proximity to expected location.

    const quoteScore = 1 - match.errors / quote.length;

    const prefixScore = context.prefix
      ? textMatchScore(
          text.slice(match.start - context.prefix.length, match.start),
          context.prefix
        )
      : 1.0;
    const suffixScore = context.suffix
      ? textMatchScore(
          text.slice(match.end, match.end + context.suffix.length),
          context.suffix
        )
      : 1.0;

    let posScore = 1.0;
    if (typeof context.hint === 'number') {
      const offset = Math.abs(match.start - context.hint);
      posScore = 1.0 - offset / text.length;
    }

    const maxScore = quoteWeight + prefixWeight + suffixWeight + posWeight;
    const rawScore =
      quoteWeight * quoteScore +
      prefixWeight * prefixScore +
      suffixWeight * suffixScore +
      posWeight * posScore;
    const normalizedScore = rawScore / maxScore;

    return normalizedScore;
  };

  const scoredMatches = matches.map(m => ({
    start: m.start,
    end: m.end,
    score: scoreMatch(m),
  }));

  // Choose match with highest score.
  scoredMatches.sort((a, b) => b.score - a.score);
  return scoredMatches[0];
}
