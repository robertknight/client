/** @type {Worker|null} */
let worker = null;
let nextTaskId = 0;

/**
 * @typedef Task
 * @prop {(result: unknown) => void} resolve
 * @prop {(error: unknown) => void} reject
 */

/**
 * Map of task ID to associated data for running tasks.
 *
 * @type {Map<number, Task>}
 */
const workerTasks = new Map();

/**
 * Start (if needed) and return the Web Worker.
 *
 * A single worker is currently used for all tasks. We could in future improve
 * parallelism at the expensive of more memory by using a pool of workers.
 */
function startWorker() {
  if (worker) {
    return worker;
  }

  // Web Workers are required to be same-origin as the page they are launched
  // from. This is a pain for us because this code is run on arbitrary domains
  // being annotated. However it is possible on most sites (those without a
  // strict Content Security Policy) to generate an inline script that then
  // loads code from other domains.
  //
  // See also https://github.com/whatwg/html/issues/6911.

  /** @param {MessageEvent} event */
  const handleWorkerMessage = async event => {
    // nb. This function is run in the worker so it must not reference any
    // variables from the parent scope.
    const { taskId, scriptURL, exportsName, func, args } = event.data;
    try {
      if (self[exportsName] === undefined) {
        // @ts-expect-error - TS doesn't know we're in a Web Worker context
        // eslint-disable-next-line no-undef
        importScripts(scriptURL);
      }

      const module = /** @type {any} */ (self[exportsName]);
      if (!module) {
        throw new Error(
          `Script did not create an exports variable named "${exportsName}"`
        );
      }
      if (typeof module[func] !== 'function') {
        throw new Error(`Script does not export a function named "${func}"`);
      }

      const result = module[func].call(null, ...args);
      self.postMessage({ taskId, result });
    } catch (err) {
      self.postMessage({ taskId, error: err.message });
    }
  };

  const workerScript = `self.onmessage = ${handleWorkerMessage}`;
  const workerURL = URL.createObjectURL(
    new Blob([workerScript], { type: 'text/javascript' })
  );

  worker = new Worker(workerURL);
  worker.onmessage = e => {
    const task = workerTasks.get(e.data.taskId);
    if (!task) {
      return;
    }
    workerTasks.delete(e.data.taskId);
    if (e.data.error !== undefined) {
      task.reject(e.data.error);
    } else {
      task.resolve(e.data.result);
    }
  };
  return worker;
}

/**
 * Run a function in a Web Worker.
 *
 * @template T
 * @param {string} scriptURL - Script exporting the function to run. This is
 *   resolved against the URL of the calling module script. The script should
 *   be a classic script which sets a global variable containing its exports.
 *
 *   This function currently requires a classic script because some browsers
 *   (mainly Firefox) do not support importing ES modules in Web Workers, as of 2021-11.
 *
 *   Once all of our target browsers support ES module imports in workers, we can
 *   use that instead. This would remove the need for the `exportsName` argument.
 *
 * @param {string} exportsName - Name of the global variable the script uses for exports
 * @param {string} func - Name of the exported function to call
 * @param {unknown[]} args - Arguments to function. These must be structured-cloneable.
 * @return {Promise<T>}
 */
export function runInWorker(scriptURL, exportsName, func, args) {
  scriptURL = new URL(scriptURL, import.meta.url).toString();

  return new Promise((resolve, reject) => {
    const taskId = ++nextTaskId;
    const worker = startWorker();
    worker.postMessage({
      taskId,
      scriptURL,
      exportsName,
      func,
      args,
    });
    workerTasks.set(taskId, /** @type {Task} */ ({ resolve, reject }));
  });
}
