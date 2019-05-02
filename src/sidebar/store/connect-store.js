'use strict';

/**
 * Utilities for connecting React/Preact components to the Redux store.
 *
 * `withPropsFromStore` is a helper that wraps a component, passes it state from
 * the store and re-renders when the relevant state changes.
 *
 * `useStoreState` is a lower-level API that can be used within a function
 * component.
 *
 * `reactToStoreChanges` is a utility for running arbitrary functions when
 * certain state in the store changes.
 */

const shallowEqual = require('shallowequal');
const { createElement } = require('preact');
const { useContext, useEffect, useRef, useReducer } = require('preact/hooks');

const { ServiceContext } = require('../util/service-context');

function getState(store, storeProps) {
  const state = {};
  Object.keys(storeProps).forEach(key => (state[key] = storeProps[key](store)));
  return state;
}

/**
 * Extract state from a Redux store and subscribe to future updates.
 *
 * @param {Function} storeProps -
 *   Function that takes a store and returns an object with state of interest
 * @return {Object} - Extracted state
 */
function useStateFromStore(storeProps) {
  const store = useContext(ServiceContext).get('store');
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
 * Run a function whenever certain state in the store changes.
 *
 * @example
 *   reactToChanges(
 *     store,
 *     { user: () => store.loggedInUser(), },
 *     ({ user }) => {
 *       fetchDataForUser(user)
 *       .then(...)
 *       .catch(...);
 *   });
 *
 * @param {Store} store - Redux store
 * @param {Object} storeProps -
 *   Object that maps keys to functions that extract a value from the store
 * @param {Function} handler
 *   Function that is called when any of the extracted state changes.
 * @return {() => void} Function that unsubscribes from changes
 */
function reactToStoreChanges(
  store,
  storeProps,
  handler,
  { initialRun = false } = {}
) {
  let prevState = getState(store, storeProps);
  const checkForChange = () => {
    const newState = getState(store, storeProps);
    if (!shallowEqual(prevState, newState)) {
      prevState = newState;
      handler(newState);
    }
  };

  if (initialRun) {
    handler(prevState);
  }

  const unsubscribe = store.subscribe(checkForChange);
  return unsubscribe;
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
    const state = useStateFromStore(storeProps);
    return <Component {...state} {...props} />;
  }
  Wrapper.displayName = `withPropsFromStore(${Component.displayName ||
    Component.name})`;

  // Copy across the prop types for props that do not come from the store.
  Wrapper.propTypes = {};
  Object.keys(Component.propTypes).forEach(key => {
    if (!(key in storeProps)) {
      Wrapper.propTypes[key] = Component.propTypes[key];
    }
  });

  return Wrapper;
}

module.exports = {
  reactToStoreChanges,
  useStateFromStore,
  withPropsFromStore,
};
