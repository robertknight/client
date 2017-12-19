// Allow non-strict comparisons to `null`.
/* eslint eqeqeq: ["error", "smart"] */

'use strict';

/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// This class will process the results of search and generate the correct filter
// It expects the following dict format as rules
// { facet_name : {
//      formatter: to format the value (optional)
//      path: json path mapping to the annotation field
//      case_sensitive: true|false (default: false)
//      and_or: and|or for multiple values should it threat them as 'or' or 'and' (def: or)
//      operator: if given it'll use this operator regardless of other circumstances
//
//      options: backend specific options
//      options.es: elasticsearch specific options
//      options.es.query_type : can be: simple (term), query_string, match, multi_match
//         defaults to: simple, determines which es query type to use
//      options.es.cutoff_frequency: if set, the query will be given a cutoff_frequency for this facet
//      options.es.and_or: match and multi_match queries can use this, defaults to and
//      options.es.match_type: multi_match query type
//      options.es.fields: fields to search for in multi-match query
// }
// The models is the direct output from visualsearch
let QueryParser;
module.exports = QueryParser = (function() {
  QueryParser = class QueryParser {
    constructor() {
      this.populateFilter = this.populateFilter.bind(this);
    }

    static initClass() {
      this.prototype.rules = {
        user: {
          path: '/user',
          and_or: 'or',
        },
        text: {
          path: '/text',
          and_or: 'and',
        },
        tag: {
          path: '/tags',
          and_or: 'and',
        },
        quote: {
          path: '/quote',
          and_or: 'and',
        },
        uri: {
          formatter(uri) {
            return uri.toLowerCase();
          },
          path: '/uri',
          and_or: 'or',
          options: {
            es: {
              query_type: 'match',
              cutoff_frequency: 0.001,
              and_or: 'and',
            },
          },
        },
        since: {
          formatter(past) {
            const seconds = (() => {
              switch (past) {
                case '5 min':
                  return 5 * 60;
                case '30 min':
                  return 30 * 60;
                case '1 hour':
                  return 60 * 60;
                case '12 hours':
                  return 12 * 60 * 60;
                case '1 day':
                  return 24 * 60 * 60;
                case '1 week':
                  return 7 * 24 * 60 * 60;
                case '1 month':
                  return 30 * 24 * 60 * 60;
                case '1 year':
                  return 365 * 24 * 60 * 60;
                default:
                  return 0;
              }
            })();
            return new Date(new Date().valueOf() - seconds * 1000);
          },
          path: '/created',
          and_or: 'and',
          operator: 'ge',
        },
        any: {
          and_or: 'and',
          path: ['/quote', '/tags', '/text', '/uri', '/user'],
          options: {
            es: {
              query_type: 'multi_match',
              match_type: 'cross_fields',
              and_or: 'and',
              fields: ['quote', 'tags', 'text', 'uri.parts', 'user'],
            },
          },
        },
      };
    }

    populateFilter(filter, query) {
      // Populate a filter with a query object
      return (() => {
        const result = [];
        for (let category in query) {
          if (!query.hasOwnProperty(category)) {
            continue;
          }
          var oper_part;
          var value_part;
          const value = query[category];
          if (this.rules[category] == null) {
            continue;
          }
          var { terms } = value;
          if (!terms.length) {
            continue;
          }
          var rule = this.rules[category];

          // Now generate the clause with the help of the rule
          var case_sensitive =
            rule.case_sensitive != null ? rule.case_sensitive : false;
          const and_or = rule.and_or != null ? rule.and_or : 'or';
          var mapped_field = rule.path != null ? rule.path : `/${category}`;

          if (and_or === 'or') {
            oper_part = rule.operator != null ? rule.operator : 'match_of';

            value_part = [];
            for (let term of Array.from(terms)) {
              const t = rule.formatter ? rule.formatter(term) : term;
              value_part.push(t);
            }

            result.push(
              filter.addClause(
                mapped_field,
                oper_part,
                value_part,
                case_sensitive,
                rule.options
              )
            );
          } else {
            oper_part = rule.operator != null ? rule.operator : 'matches';
            result.push(
              (() => {
                const result1 = [];
                for (let val of Array.from(terms)) {
                  value_part = rule.formatter ? rule.formatter(val) : val;
                  result1.push(
                    filter.addClause(
                      mapped_field,
                      oper_part,
                      value_part,
                      case_sensitive,
                      rule.options
                    )
                  );
                }
                return result1;
              })()
            );
          }
        }
        return result;
      })();
    }
  };
  QueryParser.initClass();
  return QueryParser;
})();
