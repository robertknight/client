'use strict';

/**
 * Service which connects the app's Redux store to a component.
 *
 * `connectStore` provides a way to expose data derived from the current app
 * state to a component and map callbacks to actions.
 *
 * Usage:
 *
 *   function mapStateToController(state, dispatch) {
 *     return {
 *       selectedTab: state.selectedTab,
 *       onSelectTab: function (tab) {
 *         dispatch({type: 'SELECT_TAB', tab: tab});
 *       },
 *     }
 *   }
 *
 *   function TabBarController(connectStore) {
 *     // Expose `selectedTab` and `onSelectTab` to the controller,
 *     // which can then be treated the same as if they had been passed in
 *     // by the parent component.
 *     connectStore(this, mapStateToController);
 *   }
 */
// @ngInject
function connectStore(annotationUI) {
  function connect(controller, mapFn) {
    function update() {
      var props = mapFn(annotationUI.getState(), annotationUI.dispatch);

      // TODO - Bail out here if `props` is shallow-equal to the previous value
      // of props.

      Object.assign(controller, props);
    }

    var unsubscribe = annotationUI.subscribe(update);
    controller.$onDestroy = unsubscribe;

    update();
  }

  return connect;
}

module.exports = connectStore;
