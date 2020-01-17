import { createStore } from 'redux';

import { createTransaction, enableTransactions } from '../create-transaction';

describe('sidebar/store/create-transaction', () => {
  const reducer = (state = 0, action) => {
    switch (action.type) {
      case 'INCREMENT':
        return state + 1;
      case 'DECREMENT':
        return state - 1;
      default:
        return state;
    }
  };

  let store;

  const incrementBy = createTransaction('incrementBy', (store, amount) => {
    for (let i = 0; i < amount; i++) {
      store.dispatch({ type: 'INCREMENT' });
    }
  });

  const incrementByRecursive = createTransaction(
    'incrementByRecursive',
    (store, amount) => {
      if (amount === 0) {
        return;
      }
      store.dispatch({ type: 'INCREMENT' });
      store.incrementByRecursive(amount - 1);
    }
  );

  beforeEach(() => {
    store = createStore(reducer, undefined, enableTransactions);
    store.addTransaction(incrementBy);
    store.addTransaction(incrementByRecursive);
  });

  describe('addTransaction store method', () => {
    it('adds a method to the store for each transaction', () => {
      assert.equal(typeof store.incrementBy, 'function');
    });
  });

  context('when a transaction is invoked', () => {
    it('runs the transaction callback with the store', () => {
      store.incrementBy(3);
      assert.equal(store.getState(), 3);
    });

    it('suppresses store subscribers during the transaction', () => {
      const subscriber = sinon.stub();

      store.subscribe(subscriber);
      store.incrementBy(5);

      assert.calledOnce(subscriber);
    });

    it('invokes store subscribers after the transaction completes', () => {
      const subscriber = sinon.stub().callsFake(() => {
        assert.equal(store.getState(), 5);
      });

      store.subscribe(subscriber);
      store.incrementBy(5);
    });

    it('supports unsubscribing', () => {
      const subscriber = sinon.stub();

      const unsubscribe = store.subscribe(subscriber);
      store.incrementBy(5);

      assert.calledOnce(subscriber);
      unsubscribe();
      subscriber.reset();

      store.incrementBy(5);
      assert.notCalled(subscriber);
    });
  });

  context('when a nested transaction is invoked', () => {
    it('dispatches the correct actions', () => {
      store.incrementByRecursive(3);

      assert.equal(store.getState(), 3);
    });

    it('suppresses store subscribers during the outer transaction', () => {
      const subscriber = sinon.stub();

      store.subscribe(subscriber);
      store.incrementByRecursive(5);

      assert.calledOnce(subscriber);
    });

    it('invokes store subscribers after the outer transaction completes', () => {
      const subscriber = sinon.stub().callsFake(() => {
        assert.equal(store.getState(), 5);
      });

      store.subscribe(subscriber);
      store.incrementByRecursive(5);
    });
  });
});
