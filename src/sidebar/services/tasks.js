const ATTEMPT_DELAYS = [500, 2000, 10000, 30000, 60000];

/**
 * Return the delay to wait after the nth attempt before trying again.
 *
 * @param {number} attempt - Number of attempts so far
 */
function attemptDelay(attempt) {
  const baseDelay =
    ATTEMPT_DELAYS[Math.min(attempt, ATTEMPT_DELAYS.length - 1)];
  return baseDelay;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Task {
  constructor({ callback, showError }) {
    this._callback = callback;
    this._canceled = false;
    this._showError = showError;

    this.result = new Promise((resolve, reject) => {
      this._resolveResult = resolve;
      this._rejectResult = reject;
    });
  }

  async run() {
    let attempts = 0;
    let result;
    while (!this._canceled) {
      try {
        result = await this._callback.call(null);
        break;
      } catch (e) {
        this._showError('Reconnecting to Hypothesis');
        ++attempts;
      }
      await delay(attemptDelay(attempts));
    }
    this._showError(null);
    this._resolveResult(result);
  }

  cancel() {
    this._canceled = true;
  }
}

/**
 * A service for executing async tasks that may fail due to network connectivity
 * problems or other transient issues.
 */
// @ngInject
export default function tasks(toastMessenger) {
  /**
   * Attempt an async task, with automatic retry and notification to the user if
   * the task fails.
   *
   * @return {Task} - Task that can be used to await completion of the task or
   *   cancel further attempts.
   */
  function try_(callback) {
    let errorMessageId = null;
    const showError = message => {
      if (errorMessageId) {
        toastMessenger.dismiss(errorMessageId);
      }
      if (!message) {
        return;
      }
      errorMessageId = toastMessenger.error(message);
    };
    const task = new Task({ callback, showError });
    task.run();
    return task;
  }

  return {
    try: try_,
  };
}
