import { readFile, stat, writeFile } from 'fs/promises';

/**
 * A simple JSON-based disk cache for storing the results of code transformations.
 *
 * The cache data is stored as a JSON file whose keys are file paths and values
 * are cache entries.
 */
class Cache {
  /**
   * @param {string} path - Path for the cache data file
   */
  constructor(path) {
    this._cacheData = null;
    this._cacheFile = path;
    this._pendingFlush = null;
  }

  /**
   * Return the cached data for a file, if the file has not changed since the
   * cache entry was created.
   *
   * @param {string} path
   */
  async get(path) {
    const { mtime: currentMtime } = await stat(path);

    if (!this._cacheData) {
      try {
        this._cacheData = JSON.parse(
          await readFile(this._cacheFile, { encoding: 'utf8' })
        );
      } catch {
        this._cacheData = {};
      }
    }

    if (!this._cacheData.hasOwnProperty(path)) {
      return null;
    }

    const { mtime, ...entry } = this._cacheData[path];
    if (currentMtime.toString() !== mtime) {
      return null;
    }

    return entry;
  }

  /**
   * Add or replace an existing cache entry.
   *
   * @param {string} path - Absolute file path
   * @param {object} entry - JSON-serializable data for the cache entry.
   */
  async upsert(path, entry) {
    const { mtime } = await stat(path);
    this._cacheData[path] = {
      mtime: mtime.toString(),
      ...entry,
    };
    this._scheduleFlush();
  }

  _scheduleFlush() {
    if (this._pendingFlush) {
      return;
    }
    this._pendingFlush = setTimeout(async () => {
      this._pendingFlush = null;
      await writeFile(
        this._cacheFile,
        Buffer.from(JSON.stringify(this._cacheData, null, 2))
      );
    }, 500);
  }
}

/**
 * A Rollup plugin which caches the results of a code transformation plugin
 * to disk.
 *
 * This can help to speed up repeated usage of an expensive transform, such as
 * @rollup/plugin-babel.
 *
 * @param {string} cacheFile - Path to the cache file
 * @param {object} plugin - A plugin to wrap. The returned plugin is a shallow
 *   copy of this plugin, but with the `transform` method wrapped to add
 *   caching.
 */
export function cacheTransform(cacheFile, plugin) {
  const cache = new Cache(cacheFile);

  const excludePatterns = [
    // Assume that vendor modules are not going to be transformed.
    '/node_modules/',

    // Ignore internal helpers whose filenames start with a null char.
    /^\0/,
  ];

  return {
    ...plugin,

    name: `cache-${plugin.name}`,

    async transform(code, filename) {
      if (excludePatterns.some(pat => filename.match(pat))) {
        return null;
      }

      let result = await cache.get(filename);
      if (result) {
        return result;
      }

      result = await plugin.transform(code, filename);
      if (!result) {
        return result;
      }

      await cache.upsert(filename, result);

      return result;
    },
  };
}
