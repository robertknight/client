/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {module, inject} = angular.mock;

// Return an ISO date string for a `Date` that is `age` seconds ago.
const isoDateWithAge = age => new Date(Date.now() - (age * 1000)).toISOString();

const poem = {
  tiger: `Tiger! Tiger! burning bright \
In the forest of the night \
What immortal hand or eye \
Could frame thy fearful symmetry?`,
  raven: `Once upon a midnight dreary, while I pondered, weak and weary, \
Over many a quaint and curious volume of forgotten lore— \
While I nodded, nearly napping, suddenly there came a tapping, \
As of some one gently rapping, rapping at my chamber door. \
“’Tis some visitor,” I muttered, “tapping at my chamber door— \
Only this and nothing more.”`
};

describe('viewFilter', function() {
  let sandbox = null;
  let fakeUnicode = null;
  let viewFilter = null;

  before(() =>
    angular.module('h', [])
    .service('viewFilter', require('../view-filter'))
  );


  beforeEach(module('h'));
  beforeEach(module(function($provide) {
    sandbox = sinon.sandbox.create();

    fakeUnicode = {
      fold: sinon.stub().returnsArg(0),
      normalize: sinon.stub().returnsArg(0)
    };

    $provide.value('unicode', fakeUnicode);
  })
  );

  beforeEach(inject(_viewFilter_ => viewFilter = _viewFilter_)
  );

  afterEach(() => sandbox.restore());


  describe('filter', function() {
    it('normalizes the filter terms', function() {
      const filters = {
        text: {
          terms: ['Tiger'],
          operator: 'and'
        }
      };

      viewFilter.filter([], filters);
      return assert.calledWith(fakeUnicode.fold, 'Tiger');
    });

    describe('filter operators', function() {
      let annotations = null;

      beforeEach(() =>
        annotations = [
          {id: 1, text: poem.tiger},
          {id: 2, text: poem.raven}
        ]);

      it('all terms must match for "and" operator', function() {
        const filters = {
          text: {
            terms: ['Tiger', 'burning', 'bright'],
            operator: 'and'
          }
        };

        const result = viewFilter.filter(annotations, filters);
        assert.equal(result.length, 1);
        return assert.equal(result[0], 1);
      });

      return it('only one term must match for "or" operator', function() {
        const filters = {
          text: {
            terms: ['Tiger', 'quaint'],
            operator: 'or'
          }
        };

        const result = viewFilter.filter(annotations, filters);
        return assert.equal(result.length, 2);
      });
    });

    describe('fields', () =>
      describe('autofalse', function() {
        it('consider auto false function', function() {
          viewFilter.fields = {
            test: {
              autofalse: sandbox.stub().returns(true),
              value(annotation) { return annotation.test; },
              match(term, value) { return value.indexOf(term) > -1; }
            }
          };

          const filters = {
            test: {
              terms: ['Tiger'],
              operator: 'and'
            }
          };

          const annotations = [{id: 1, test: poem.tiger}];

          const result = viewFilter.filter(annotations, filters);
          assert.called(viewFilter.fields.test.autofalse);
          return assert.equal(result.length, 0);
        });

        it('uses the value function to extract data from the annotation', function() {
          viewFilter.fields = {
            test: {
              autofalse(annotation) { return false; },
              value: sandbox.stub().returns('test'),
              match(term, value) { return value.indexOf(term) > -1; }
            }
          };

          const filters = {
            test: {
              terms: ['test'],
              operator: 'and'
            }
          };

          const annotations = [{id: 1, test: poem.tiger}];

          const result = viewFilter.filter(annotations, filters);
          assert.called(viewFilter.fields.test.value);
          return assert.equal(result.length, 1);
        });

        return it('the match function determines the matching', function() {
          viewFilter.fields = {
            test: {
              autofalse(annotation) { return false; },
              value(annotation) { return annotation.test; },
              match: sandbox.stub().returns(false)
            }
          };

          const filters = {
            test: {
              terms: ['Tiger'],
              operator: 'and'
            }
          };

          const annotations = [{id: 1, test: poem.tiger}];

          let result = viewFilter.filter(annotations, filters);
          assert.called(viewFilter.fields.test.match);
          assert.equal(result.length, 0);

          viewFilter.fields.test.match.returns(true);
          result = viewFilter.filter(annotations, filters);
          assert.called(viewFilter.fields.test.match);
          return assert.equal(result.length, 1);
        });
      })
    );

    describe('any field', function() {
      it('finds matches across many fields', function() {
        const annotation1 = {id: 1, text: poem.tiger};
        const annotation2 = {id: 2, user: poem.tiger};
        const annotation3 = {id: 3, tags: ['Tiger']};

        const annotations = [annotation1, annotation2, annotation3];

        const filters = {
          any: {
            terms: ['Tiger'],
            operator: 'and'
          }
        };

        const result = viewFilter.filter(annotations, filters);
        return assert.equal(result.length, 3);
      });

      return it('can find terms across different fields', function() {
        const annotation = {
          id:1,
          text: poem.tiger,
          target: [{
            selector: [{
              "type": "TextQuoteSelector",
              "exact": "The Tiger by William Blake",
            }]
          }
          ],
          user: "acct:poe@edgar.com",
          tags: ["poem", "Blake", "Tiger"]
        };

        const filters = {
          any: {
            terms: ['burning', 'William', 'poem', 'bright'],
            operator: 'and'
          }
        };

        const result = viewFilter.filter([annotation], filters);
        assert.equal(result.length, 1);
        return assert.equal(result[0], 1);
      });
    });

    describe('"uri" field', () =>
      it("matches if the query occurs in the annotation's URI", function() {
        const ann = {
          id: 1,
          uri: 'https://publisher.org/article'
        };
        const filters = {
          uri: {
            terms: ['publisher'],
            operator: 'or'
          }
        };

        const result = viewFilter.filter([ann], filters);

        return assert.deepEqual(result, [1]);
    })
  );

    return describe('"since" field', function() {
      it('matches if the annotation is newer than the query', function() {
        const ann = {
          id: 1,
          updated: isoDateWithAge(50)
        };
        const filters = {
          since: {
            terms: [100],
            operator: 'and'
          }
        };

        const result = viewFilter.filter([ann], filters);

        return assert.deepEqual(result, [1]);
    });

      return it('does not match if the annotation is older than the query', function() {
        const ann = {
          id: 1,
          updated: isoDateWithAge(150)
        };
        const filters = {
          since: {
            terms: [100],
            operator: 'and'
          }
        };

        const result = viewFilter.filter([ann], filters);

        return assert.deepEqual(result, []);
    });
  });
});

  return it('ignores filters with no terms in the query', function() {
    const ann = { id: 1, tags: ['foo'] };
    const filters = {
      any: {
        terms: ['foo'],
        operator: 'and'
      },
      tag: {
        terms: [],
        operator: 'and'
      }
    };

    const result = viewFilter.filter([ann], filters);

    return assert.deepEqual(result, [1]);
});
});
