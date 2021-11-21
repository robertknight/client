/** @type {Worker|null} */
let worker = null;

let nextTaskId = 0;

/**
 * @typedef Task
 * @prop {(result: unknown) => void} resolve - Resolve the promise associated with a task
 * @prop {(error: unknown) => void} reject - Reject the promise associated with a task
 */

/**
 * Map of task ID to associated data for tasks that are running or queued to
 * run in a worker.
 *
 * @type {Map<number, Task>}
 */
const tasks = new Map();

/**
 * Error that represents a failure to start the web worker or load a script in
 * it.
 */
export class LaunchError extends Error {}

/**
 * Start the web worker, if not already running.
 *
 * A single worker is currently used for all tasks. We improve parallelism in
 * future by using a pool of workers.
 *
 * @return {Worker}
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
    let module;

    try {
      if (self[exportsName] === undefined) {
        // @ts-expect-error - TS doesn't know we're in a Web Worker context
        // eslint-disable-next-line no-undef
        importScripts(scriptURL);
      }

      module = /** @type {any} */ (self[exportsName]);
      if (typeof module?.[func] !== 'function') {
        throw new Error(`Worker script did not set "${exportsName}.${func}"`);
      }
    } catch (err) {
      self.postMessage({ taskId, error: err.message, isLaunchError: true });
    }

    try {
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
    const task = tasks.get(e.data.taskId);
    if (!task) {
      return;
    }
    tasks.delete(e.data.taskId);
    if (e.data.error !== undefined) {
      const error = e.data.isLaunchError
        ? new LaunchError(e.data.error)
        : new Error(e.data.error);
      task.reject(error);
    } else {
      task.resolve(e.data.result);
    }
  };
  return worker;
}

/**
 * Run a function in a Web Worker and return the result asynchronously.
 *
 * This can be used to execute CPU-intensive tasks in the background without
 * blocking the UI.
 *
 * @template {unknown[]} Args
 * @template Result
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
 * @param {Args} args - Arguments to function. These must be structured-cloneable.
 * @param {(...args: Args) => Result} [fallback] - Optional fallback function to
 *   call on the main thread if launching the worker fails.
 * @return {Promise<Result>}
 */
export function runInWorker(scriptURL, exportsName, func, args, fallback) {
  const result = new Promise((resolve, reject) => {
    scriptURL = new URL(scriptURL, import.meta.url).toString();
    const taskId = ++nextTaskId;
    const worker = startWorker();
    worker.postMessage({
      taskId,
      scriptURL,
      exportsName,
      func,
      args,
    });
    tasks.set(taskId, /** @type {Task} */ ({ resolve, reject }));
  });

  return result.catch(err => {
    if (fallback && err instanceof LaunchError) {
      console.warn(
        `Failed to launch worker to run "${exportsName}.${func}". Using fallback.`
      );
      return fallback(...args);
    }
    throw err;
  });
}
