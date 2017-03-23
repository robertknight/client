'use strict';

/* global Proxy */

// Set of expressions for which warnings have been emitted
var warnedExpressions = {};

/**
 * Return a proxy which warns on accesses to undefined properties in
 * expressions.
 *
 * Angular expressions are evaluated against two context objects, `context` and
 * `locals`. This function creates and returns a proxy which intercepts property
 * lookups on `context` and emits a warning if the property does not exist,
 * corresponding to an access of an undefined variable in an Angular expression.
 *
 * @param {Object} context - The context object, usually a scope.
 * @param {Object} [locals] - A secondary context object.
 * @param {string} exprStr - The expression being evaluated.
 */
function warningProxy(context, locals, exprStr) {
  return new Proxy(context, {
    get: function (target, prop) {
      // Ignore property lookups that happen regardless of the expression.
      if (prop === 'window' || prop === 'children') {
        return target[prop];
      }

      var inContext = prop in context;
      var inLocals = locals && prop in locals;

      if (!inContext && !inLocals && !warnedExpressions[exprStr]) {
        console.warn('Undefined variable "' +  prop + '" in expr "' + exprStr + '"');
        warnedExpressions[exprStr] = true;
      }
      return target[prop];
    },
  });
}

/**
 * Wraps Angular's expression parsing service ($parse) to warn when an
 * expression attempts to lookup an undefined variable.
 *
 * Usage: Pass this function to an Angular module's `config` method.
 *
 * Angular's expression parser is "forgiving" by default and unhelpfully
 * provides no diagnostics if a template expression fails to parse due to a typo
 * in an identifier name. Instead the expression just evaluates to undefined.
 */
// @ngInject
function configureWarnOnUndefinedExpressions($provide) {
  $provide.decorator('$parse', ['$delegate', function ($delegate) {
    if (typeof Proxy === 'undefined') {
      return $delegate;
    }

    return function (expr, interceptor) {
      var exprFn = $delegate(expr, interceptor);
      if (typeof expr !== 'string') {
        return exprFn;
      }
      return function (context, locals) {
        var contextProxy = warningProxy(context, locals, expr);
        var result = exprFn(contextProxy, locals);
        return result;
      };
    };
  }]);
}

module.exports = configureWarnOnUndefinedExpressions;

