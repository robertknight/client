'use strict';

/**
 * Utilities for connecting React/Preact components to the Redux store.
 *
 * `withStoreState` is a helper that wraps a component, passes it state from
 * the store and re-renders when the relevant state changes.
 *
 * `useStoreState` is a lower-level API that can be used within a function
 * component.
 */

const shallowEqual = require('shallowequal');
const propTypes = require('prop-types');
const { createElement } = require('preact');

const { useEffect, useRef, useReducer } = require('preact/hooks');

/**
 * Extract state from a Redux store and subscribe to future updates.
 *
 * Returns `getState(store)` and set up a subscription that will cause the
 * current component to re-render whenever that changes.
 *
 * @param {Object} store - Redux store
 * @param {Function} getState -
 *   Function that takes a store and returns an object with state of interest
 * @return {Object} - Extracted state
 */
function useStoreState(store, getState) {
  const state = useRef(getState(store));
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const checkForUpdate = () => {
      const newState = getState(store);
      if (!shallowEqual(state.current, newState)) {
        state.current = newState;
        forceUpdate();
      }
    };

    // Check for changes in-between the initial render and the effect
    // being called.
    checkForUpdate();

    // Listen for any future updates to the store, and unsubscribe when
    // component is removed.
    const unsubscribe = store.subscribe(checkForUpdate);
    return unsubscribe;
  }, [getState, store]);

  return state.current;
}

/**
 * Wrap a component to render data from the store and re-render when the
 * data in the store changes.
 *
 * @example
 *   function MyWidget({ currentUser, logOut }) {
 *     return <div>
 *      Logged in as {currentUser}. <button onClick={logOut}>Log out</button>
 *     </div>
 *   }
 *   MyWidget = withStoreState(MyWidget, store => ({
 *     currentUser: store.getLoggedInUser(),
 *     logOut: store.logOut,
 *   }))
 *
 * @param {Function} Component - The React component to wrap
 * @param {Function} getState -
 *   Function that accepts a store and returns an object with extracted state.
 *   This state is passed to the wrapped component.
 * @return {Function} The wrapped component
 */
function withStoreState(Component, getState) {
  function Wrapper(props) {
    const state = useStoreState(props.store, getState);
    return <Component {...state} {...props} />;
  }
  Wrapper.displayName = `withStoreState(${Component.displayName ||
    Component.name})`;

  // When using the wrapped component with the `wrapReactComponent` utility,
  // make sure that the application's Redux store gets injected.
  Wrapper.propTypes = {
    store: propTypes.object,
  };
  Wrapper.injectedProps = ['store', ...(Component.injectedProps || [])];

  return Wrapper;
}

module.exports = {
  useStoreState,
  withStoreState,
};
