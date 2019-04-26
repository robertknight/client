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

function getState(store, storeProps) {
  const state = {};
  Object.keys(storeProps).forEach(key =>
    state[key] = storeProps[key](store)
  );
  return state;
}

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
function useStoreState(store, storeProps) {
  const state = useRef(getState(store, storeProps));
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const checkForUpdate = () => {
      const newState = getState(store, storeProps);
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
  }, [storeProps, store]);

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
 *   MyWidget = withPropsFromStore(MyWidget, {
 *     currentUser: store => store.getLoggedInUser(),
 *     logOut: store => store.logOut,
 *   }))
 *
 * @param {Function} Component - The React component to wrap
 * @param {Object} storeProps -
 *   Object that maps prop names to functions that extract that property from
 *   the store.
 * @return {Function} The wrapped component
 */
function withPropsFromStore(Component, storeProps) {
  function Wrapper(props) {
    const state = useStoreState(props.store, storeProps);
    return <Component {...state} {...props} />;
  }
  Wrapper.displayName = `withStoreState(${Component.displayName ||
    Component.name})`;

  // When using the wrapped component with the `wrapReactComponent` utility,
  // make sure that the application's Redux store gets injected.
  Wrapper.propTypes = {
    store: propTypes.object,
  };

  // Copy across the prop types for props that do not come from the store.
  Object.keys(Component.propTypes).forEach(key => {
    if (!(key in storeProps)) {
      Wrapper.propTypes[key] = Component.propTypes[key];
    }
  });

  Wrapper.injectedProps = ['store', ...(Component.injectedProps || [])];

  return Wrapper;
}

module.exports = {
  useStoreState,
  withPropsFromStore,
};
