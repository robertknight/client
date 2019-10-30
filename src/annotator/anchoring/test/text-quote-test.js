'use strict';

const { default: search } = require('approx-string-match');

const { fromTextPosition, toTextPosition } = require('../text-quote');

describe('annotator/anchoring/text-quote', () => {
  // Text from http://www.americanyawp.com/text/01-the-new-world/.
  const text = `
Europeans called the Americas “the New World.” But for the millions of Native Americans they encountered, it was anything but. Humans have lived in the Americas for over ten thousand years. Dynamic and diverse, they spoke hundreds of languages and created thousands of distinct cultures. Native Americans built settled communities and followed seasonal migration patterns, maintained peace through alliances and warred with their neighbors, and developed self-sufficient economies and maintained vast trade networks. They cultivated distinct art forms and spiritual values. Kinship ties knit their communities together. But the arrival of Europeans and the resulting global exchange of people, animals, plants, and microbes—what scholars benignly call the Columbian Exchange—bridged more than ten thousand years of geographic separation, inaugurated centuries of violence, unleashed the greatest biological terror the world had ever seen, and revolutionized the history of the world. It began one of the most consequential developments in all of human history and the first chapter in the long American yawp.
`;

  const findPosition = (substring, nth = 0) => {
    let start = 0;
    while (nth >= 0 && start !== -1) {
      start = text.indexOf(substring, start);
      --nth;
    }
    if (start < 0) {
      throw new Error(`Could not find substring occurrence of "${substring}"`);
    }
    return { start, end: start + substring.length };
  };

  const findQuote = (quote, nth = 0) => {
    const { start, end } = findPosition(quote, nth);
    return fromTextPosition(text, start, end);
  };

  const randomInt = max => Math.floor(Math.random() * max);

  const corrupt = (quote, edits = 0) => {
    let corrupted = quote;
    while (edits > 0) {
      --edits;
      const pos = randomInt(corrupted.length);
      const op = randomInt(3);
      switch (op) {
        case 0: // Insert
          corrupted = corrupted.slice(0, pos) + 'X' + corrupted.slice(pos);
          break;
        case 1: // Replace
          corrupted = corrupted.slice(0, pos) + 'X' + corrupted.slice(pos + 1);
          break;
        case 2: // Delete
          corrupted = corrupted.slice(0, pos) + corrupted.slice(pos + 1);
          break;
      }
    }
    return corrupted;
  };

  describe('fromTextPosition', () => {
    [
      {
        ...findPosition('the millions'),
        contextLen: 5,
        expected: {
          exact: 'the millions',
          prefix: ' for ',
          suffix: ' of N',
        },
      },
    ].forEach(({ start, end, contextLen, expected }) => {
      it('returns correct quote', () => {
        const quote = fromTextPosition(text, start, end, contextLen);
        assert.deepEqual(quote, expected);
      });
    });

    it('returns correct quote for short text', () => {
      const quote = fromTextPosition('short text', 0, 5);
      assert.deepEqual(quote, {
        exact: 'short',
        prefix: '',
        suffix: ' text',
      });
    });
  });

  describe('toTextPosition', () => {
    [
      // Complete mismatch.
      'Not found in text',

      // Fuzzy match which is too far from the nearest match.
      // The error rate is proportional to the length of the quote.
      'history of the country',
    ].forEach(quote => {
      it('throws if quote is not found', () => {
        assert.throws(() => {
          toTextPosition(text, quote);
        }, 'Quote not found');
      });
    });

    [
      findQuote('the millions'),
      findQuote(
        'warred with their neighbors, and developed self-sufficient economies and maintained'
      ),
    ].forEach(({ exact, prefix, suffix }) => {
      it('returns correct range for exact matches', () => {
        const [start, end] = toTextPosition(text, exact, prefix, suffix);
        assert.equal(text.slice(start, end), exact);
      });
    });

    [
      findQuote('the millions'),
      findQuote(
        'warred with their neighbors, and developed self-sufficient economies and maintained'
      ),
    ].forEach(({ exact, prefix, suffix }) => {
      it('returns correct range for fuzzy matches', () => {
        const corrupted = corrupt(exact, exact.length * 0.15);

        const [start, end] = toTextPosition(text, corrupted, prefix, suffix);

        // Check that the matched text closely matches the original quote.
        //
        // It might not match exactly because there may be multiple windows of
        // the text which match the quote selector with the same edit distance.
        // In that case the chosen window may not be the original one.
        const matchQuote = text.slice(start, end);
        const matches = search(matchQuote, exact, exact.length * 0.15);
        assert.equal(matches.length, 1);
      });
    });

    [
      {
        pattern: 'the',
        nth: 3,
      },
      {
        pattern: 'and the',
        nth: 1,
      },
    ].forEach(({ pattern, nth }) => {
      it('returns best match based on surrounding context when there are multiple candidates', () => {
        const { exact, prefix, suffix } = findQuote(pattern, nth);
        const expectedPosition = findPosition(pattern, nth);

        const [start, end] = toTextPosition(text, exact, prefix, suffix);

        assert.deepEqual({ start, end }, expectedPosition);
      });
    });
  });
});
