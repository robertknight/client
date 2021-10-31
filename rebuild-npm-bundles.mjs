import * as path from 'path';
import { readFileSync, statSync } from 'fs';

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import virtual from '@rollup/plugin-virtual';
import { string } from 'rollup-plugin-string';
import * as rollup from 'rollup';

function getNPMBundles(cacheNames) {
  const combined = {};
  for (let name of cacheNames) {
    const depsFile = `build/cache/${name}/npm-dependencies.json`;
    const vendorDeps = JSON.parse(readFileSync(depsFile).toString());
    Object.assign(combined, vendorDeps);
  }
  return combined;
}

function bundlePath(name) {
  return `build/scripts/npm/${name}.bundle.js`;
}

function relativeBundlePath(from, to) {
  const relativePath = path.relative(path.dirname(from), to);
  if (relativePath.startsWith('.')) {
    return relativePath;
  } else {
    return `./${relativePath}`;
  }
}

function bundleConfig(name, deps) {
  return {
    input: name,
    output: {
      file: bundlePath(name),
      format: 'es',
      sourcemap: true,
      paths: Object.fromEntries(
        deps.map(dep => [
          dep,
          relativeBundlePath(bundlePath(name), bundlePath(dep)),
        ])
      ),
    },
    external: deps.filter(d => d !== name),
    plugins: [
      // Replace some problematic dependencies which are imported but not actually
      // used with stubs. Per @rollup/plugin-virtual's docs, this must be listed
      // first.
      virtual({
        // Enzyme dependency used in its "Static Rendering" mode, which we don't use.
        'cheerio/lib/utils': '',
        cheerio: '',

        // Node modules that are not available in the browser.
        crypto: '',
        util: '',
      }),
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        },
      }),
      nodeResolve(),
      commonjs(),
      string({
        include: '**/*.svg',
      }),
    ],
  };
}

async function buildNPMBundles() {
  const npmBundles = getNPMBundles(['sidebar', 'annotator', 'boot', 'tests']);
  const npmBundleList = Object.entries(npmBundles)
    .filter(([name, timestamp]) => {
      try {
        const outputTimestamp = statSync(bundlePath(name)).mtimeMs;
        if (outputTimestamp >= timestamp) {
          return false;
        }
        return true;
      } catch (err) {
        return true;
      }
    })
    .map(([name]) => name)
    .sort();

  if (npmBundleList.length === 0) {
    return;
  }

  console.log(`Building NPM bundles: ${npmBundleList.join(', ')}`);

  const configs = npmBundleList.map(name => bundleConfig(name, npmBundleList));
  await Promise.all(
    configs.map(async config => {
      const bundle = await rollup.rollup({
        ...config,
        onwarn: console.log,
      });
      await bundle.write(config.output);
    })
  );
}

await buildNPMBundles();
