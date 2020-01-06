'use strict';

const fs = require('fs');
const path = require('path');

const recast = require('recast');
const babelTraverse = require('@babel/traverse').default;
const resolve = require('resolve');
const types = require('@babel/types');
const glob = require('glob');

function parse(code) {
  return recast.parse(code, {
    parser: require('recast/parsers/babel'),
  });
}

/**
 * Analyze the exports of a CommonJS module and return `true` if the module
 * should be considered to have a "default" export.
 */
function detectDefaultExport(code) {
  let hasDefaultExport = false;

  const ast = parse(code);

  babelTraverse(ast, {
    AssignmentExpression(path) {
      const target = path.node.left;

      // module.exports = ...
      const isModuleExportsAssignment =
        target.type === 'MemberExpression' &&
        target.object.name === 'module' &&
        target.property.name === 'exports';

      // exports = ...
      const isExportsAssignment =
        target.type === 'Identifier' && target.name === 'exports';

      if (!isModuleExportsAssignment && !isExportsAssignment) {
        return;
      }

      hasDefaultExport = path.node.right.type !== 'ObjectExpression';
    },
  });

  return hasDefaultExport;
}

/**
 * Find all the CommonJS/Node `require` calls in a source file and invoke
 * `callback` with `(path, dependencyPath, absoluteDependencyPath)` where
 * `path` is a Babel AST path.
 */
function processCommonJSImports(modulePath, callback) {
  const code = fs.readFileSync(modulePath).toString();
  const ast = parse(code);
  babelTraverse(ast, {
    CallExpression(path) {
      // Check that this is a `require` call with a single string literal arg.
      const isRequireCall =
        types.isIdentifier(path.node.callee) &&
        path.node.callee.name === 'require';

      if (!isRequireCall) {
        return;
      }

      if (
        path.node.arguments.length !== 1 ||
        !types.isStringLiteral(path.node.arguments[0])
      ) {
        return;
      }

      const dependencyPath = path.node.arguments[0].value;
      const absPath = absoluteDependencyPath(modulePath, dependencyPath);

      callback(path, dependencyPath, absPath);
    },
  });

  return ast;
}

/**
 * Convert CommonJS/Node `require` statements to ES `import` syntax.
 *
 * @param {string} modulePath - Absolute path to the JS module to convert.
 * @param {Object} hasDefaultExport - A map of absolute paths to dependencies to
 *   booleans indicating whether the module has a default export or not.
 */
function convertCommonJSImports(modulePath, hasDefaultExport) {
  const ast = processCommonJSImports(
    modulePath,
    (path, requirePath, requireAbsPath) => {

      let esImportDecl;
      let cjsRequireStatement;

      if (
        types.isVariableDeclarator(path.parent) &&
        types.isVariableDeclaration(path.parentPath.parent) &&
        types.isProgram(path.parentPath.parentPath.parent)
      ) {
        // Top level `var ... = require('<path>');` statement.

        if (types.isIdentifier(path.parent.id)) {
          // var foo = require('foo');
          let specifier;
          if (hasDefaultExport[requireAbsPath]) {
            specifier = types.importDefaultSpecifier(
              types.identifier(path.parent.id.name)
            );
          } else {
            specifier = types.importNamespaceSpecifier(
              types.identifier(path.parent.id.name)
            );
          }

          esImportDecl = types.importDeclaration(
            [specifier],
            types.stringLiteral(requirePath)
          );

          // Replace the grandparent `var ... = ...` statement with an `import`
          // statement.
          cjsRequireStatement = path.parentPath.parentPath;
        } else if (types.isObjectPattern(path.parent.id)) {
          // var { foo } = require('foo');
          const specifiers = [];
          path.parent.id.properties.forEach(pattern => {
            if (!types.isIdentifier(pattern.key)) {
              throw new Error(
                `Unsupported object pattern syntax for "${requirePath}" require`
              );
            }
            if (!types.isIdentifier(pattern.value)) {
              throw new Error(
                `Unsupported object pattern syntax for "${requirePath}" require`
              );
            }

            const exportName = pattern.key.name;
            const alias = pattern.value.name;

            specifiers.push(
              types.importSpecifier(
                types.identifier(alias),
                types.identifier(exportName)
              )
            );
          });

          esImportDecl = types.importDeclaration(
            specifiers,
            types.stringLiteral(requirePath)
          );

          // Replace the grandparent `var ... = ...` statement with an `import`
          // statement.
          cjsRequireStatement = path.parentPath.parentPath;
        } else {
          throw new Error(`Unable to handle require for "${requirePath}"`);
        }
      } else if (
        types.isExpressionStatement(path.parent) &&
        types.isProgram(path.parentPath.parent)
      ) {
        // Top-level `require('foo');` statement.
        esImportDecl = types.importDeclaration(
          [],
          types.stringLiteral(requirePath)
        );

        // Replace the containing statement with an import declaration.
        cjsRequireStatement = path.parentPath;
      }

      // FIXME - Comments before and after replaced nodes are not retained.
      if (esImportDecl && cjsRequireStatement) {
        cjsRequireStatement.replaceWith(esImportDecl);
      }
    }
  );

  const output = recast.print(ast);
  return output.code;
}

function unique(array) {
  return Array.from(new Set(array));
}

/**
 * Return the absolute path of a dependency `require`'d by `modulePath`
 *
 * @param {string} modulePath - Absolute path to calling module
 * @param {string} dependency - Path of the dependency, as specified by code in `modulePath`
 * @return {string} Absolute path to the dependency
 */
function absoluteDependencyPath(modulePath, dependency) {
  if (typeof modulePath !== 'string') {
    throw new Error('Module path is not a string');
  }
  if (typeof dependency !== 'string') {
    throw new Error('Dependency path is not a string');
  }

  return resolve.sync(dependency, {
    basedir: path.dirname(modulePath),
    extensions: ['.js', '.coffee'],
  });
}

/**
 * Return JavaScript source for a module.
 *
 * This just reads the module if it is already JavaScript or compiles it to JavaScript
 * otherwise.
 */
function getJavaScriptSource(modulePath, transpilers = {}) {
  let code = fs.readFileSync(modulePath).toString();
  if (!modulePath.endsWith('.js')) {
    const ext = path.extname(modulePath);
    if (transpilers[ext]) {
      return transpilers[ext](code);
    } else {
      throw new Error(`Unable to compile ${modulePath} to JavaScript`);
    }
  }
  return code;
}

const srcGlobs = process.argv[2];
const srcPaths = glob.sync(srcGlobs);
const transpilers = {
  '.coffee': code => require('coffee-script').compile(code),
};

// Step 1: Find all the modules `require`-d by the modules we are going to convert.
console.log(`Finding direct dependencies of files matching "${srcGlobs}"...`);
const modulePaths = unique(
  srcPaths.flatMap(srcPath => {
    const requiredPaths = [];
    processCommonJSImports(srcPath, (path, requirePath, requireAbsPath) => {
      requiredPaths.push(requireAbsPath);
    });
    return requiredPaths;
  })
);

// Step 2: Analyze the exports of each module that is `require`-d to determine
// whether it has a default export. We need this information to know whether
// a statement such as `var foo = require('foo')` should be converted to
// `import foo from 'foo'` or `import * as foo from 'foo'`.
console.log('Analyzing module exports...');
let hasDefaultExport = {};
modulePaths.forEach(absPath => {
  try {
    if (absPath.endsWith('.js') || path.extname(absPath) in transpilers) {
      // If this module is JavaScript or something that this script can convert
      // to JavaScript then process it to determine whether it has a default export.
      const code = getJavaScriptSource(absPath, transpilers);
      hasDefaultExport[absPath] = detectDefaultExport(code);
    } else {
      // For other file types supported by custom loaders, make a default assumption
      // that they do have a default export as that is the most typical case.
      hasDefaultExport[absPath] = true;
    }
  } catch (err) {
    console.error(`Could not process ${absPath}`, err);
  }
});

// Apply overrides for modules where the type of default export is not correctly
// determined automatically by the logic above.
const hasDefaultExportOverrides = {
  'dom-anchor-text-quote': false,
  katex: false,
};

Object.keys(hasDefaultExportOverrides).forEach(dependency => {
  const absPath = require.resolve(dependency);
  hasDefaultExport[absPath] = hasDefaultExportOverrides[dependency];
});

// Step 3. Re-process each module and convert top-level CommonJS requires to
// imports. The following statements are recognized, and they must be top-level
// statements:
//
// a) require('foo');
// b) var foo = require('foo');
// c) var { foo } = require('foo');

console.log('Converting CommonJS imports to `import ... from ...` syntax...');
srcPaths.forEach(path => {
  const code = convertCommonJSImports(path, hasDefaultExport);
  fs.writeFileSync(path, code);
});
