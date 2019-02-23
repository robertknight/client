/**
 * Support for lazily loading application features only when they are needed.
 *
 * This is divided into two parts. `registerModule` is called by the boot
 * script to register the URLs of modules which can be lazily loaded later.
 *
 * `registerModule` must support being run in an environment without polyfills
 * loaded.
 *
 * `lazyLoad` is called by app code to load a module when it is needed.
 * The `lazyLoad` implementation can assume that polyfills (eg. for Promise and
 * URL) have been loaded.
 */

/**
 * Create (or return existing) global cache of lazily-loadable modules.
 */
function getCache() {
  if (!self._lazyLoad) {
    self._lazyLoad = {
      /**
       * A map of module name to the URLs of the assets that provide the code
       * and associated resources (eg. CSS).
       *
       * A 1-N mapping of module <-> URLs is assumed.
       */
      urls: {},

      /**
       * Map of module name to promise that resolves when the module is loaded.
       */
      modules: {},
    };
  }
  return self._lazyLoad;
}

/**
 * Load a script or stylesheet asset.
 *
 * @return {Promise} - Promise that resolves once the asset has loaded
 */
function loadAsset(url) {
  return new Promise((resolve, reject) => {
    let el;
    const path = new URL(url).pathname;
    if (path.endsWith('.js')) {
      el = document.createElement('script');
      el.src = url;
    } else if (path.endsWith('.css')) {
      el = document.createElement('link');
      el.rel = 'stylesheet';
      el.href = url;
    } else {
      throw new Error(`Unknown asset type: ${url}`);
    }
    el.onload = resolve;
    el.onerror = reject;
    document.body.appendChild(el);
  });
}

// It is important to use `self.hypothesisRequire` rather than just
// `hypothesisRequire` here because `self.hypothesisRequire` is
// re-assigned as new bundles are loaded, and newly loaded modules are only
// visible to the latest `hypothesisRequire` function.
const defaultLoader = module => self.hypothesisRequire(module);

/**
 * Lazily load a module. The URL of the script providing the module must have
 * been registered using `registerModule`.
 *
 * @param {string} moduleName
 * @param {(moduleName: string) => any} loaderFn - Function to call to get
 *   the module's exports once its assets have been fetched
 * @return {Promise<any>} - A promise for the module's exports
 */
export function lazyLoad(moduleName, loaderFn = defaultLoader) {
  const cache = getCache();

  // Check if module has already been loaded or is already loading.
  const module = cache.modules[moduleName];
  if (module) {
    return module;
  }

  // Otherwise, trigger loading of the module.
  const urls = cache.urls[moduleName];
  if (!urls) {
    throw new Error(
      `Module ${moduleName} has been registered for lazy-loading`
    );
  }
  const loaded = Promise.all(urls.map(loadAsset)).then(() =>
    loaderFn(moduleName)
  );
  cache.modules[moduleName] = loaded;
  return loaded;
}

/**
 * Register the URLs of assets (scripts, stylesheets) for a lazily-loadable
 * module.
 *
 * Once a module has been registered, it can be loaded on-demand using `lazyLoad`.
 */
export function registerModule(name, ...urls) {
  const cache = getCache();
  cache.urls[name] = urls;
}
