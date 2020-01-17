/**
 * A Redux "store enhancer" [1] that adds support for _transactions_ to a store.
 *
 * Transactions are a way of composing multiple low-level store actions into a
 * single logical operation. When a transaction is executed, store subscribers
 * will only be notified about state changes once after the transaction
 * completes, rather than after each action completes. This can reduce overhead
 * elsewhere in the application.
 *
 * To create a store with transaction support, pass this function as the third
 * argument to `createStore`: `store = createStore(reducer, initialState,
 * enableTransactions)`. To combine this enhancer with others, use the
 * `compose` utility function [2] from Redux.
 *
 * The created store will have an `addTransaction` method that you can use to
 * attach transactions created with `createTransaction`. Once a transaction
 * has been attached to the store, it becomes available as a method of the
 * store.
 *
 * Transactions can invoke other transactions. When that happens, subscribers
 * will only be notified once the outermost transaction completes.
 *
 * [1] See https://redux.js.org/api/createstore
 * [2] https://redux.js.org/api/compose
 *
 * @param {Function} createStore - The `createStore` function from Redux
 * @return {Function} A modified `createStore` function which creates a store
 *   using the original `createStore` and then augments it with support for
 *   transactions.
 */
export function enableTransactions(createStore) {
  function createStoreWithTransactions(reducer, initialState) {
    // Flag indicating that at least one action has been dispatched during a
    // transaction but store subscribers have not yet been notified. They will
    // be notified at the end of the outer transaction.
    let pendingNotify = false;

    // Stack of active transaction names.
    // The outermost transaction is the first item in the stack.
    let activeTransactions = [];

    const store = createStore(reducer, initialState);

    store._beginTransaction = name => {
      activeTransactions.push(name);
    };

    store._endTransaction = () => {
      activeTransactions.pop();
      if (activeTransactions.length === 0 && pendingNotify) {
        pendingNotify = false;

        // Dispatch a dummy action to trigger listeners.
        store.dispatch({ type: 'END_TRANSACTION' });
      }
    };

    // Override the store's `subscribe` method to suppress callbacks when a
    // transaction is active.
    const originalSubscribe = store.subscribe;
    store.subscribe = listener => {
      const listenerWrapper = () => {
        if (activeTransactions.length > 0) {
          pendingNotify = true;
          return;
        }
        listener();
      };
      return originalSubscribe.call(store, listenerWrapper);
    };

    store.addTransaction = transaction => {
      store[transaction.name] = transaction.bind(store);
    };

    return store;
  }

  return createStoreWithTransactions;
}

/**
 * @typedef Transaction
 * @prop {string} name - A descriptive name for the transaction
 * @prop {Function} bind -
 *   Create a function which runs the transaction with a given store
 */

/**
 * Create a transaction with a given name.
 *
 * The returned `Transaction` can be added to a store by creating the store
 * using `enableTransactions` and then calling the store's `addTransaction`
 * method.
 *
 * @param {string} name -
 *   The name of the transaction. This will be used as the method name when
 *   the transaction is added to the store using `addTransaction`
 * @param {Function} callback -
 *   Callback which is run when the transaction is invoked. This callback
 *   receives the store as well as any arguments passed to the transaction.
 *
 *   It can dispatch actions, read state or execute other transactions on the
 *   store.
 * @return {Transaction}
 */
export function createTransaction(name, callback) {
  function runTransaction(store, ...args) {
    try {
      store._beginTransaction(name);
      callback(store, ...args);
    } finally {
      // Currently transactions are not atomic because no rollback of the state
      // happens if the transaction fails mid-way through.
      store._endTransaction();
    }
  }

  return {
    name,
    bind(store) {
      return (...args) => runTransaction(store, ...args);
    },
  };
}
