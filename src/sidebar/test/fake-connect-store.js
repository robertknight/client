'use strict';

/**
 * A fake implementation of `connectStore` for use in tests.
 *
 * Usage:
 *   - Call `fakeConnectStore` to get an instance of the fake service.
 *   - Instantiate the controller or component passing the fake service
 *   - To simulate a state change, call `fakeConnectStore.updateState(<changes>)`
 *   - To check that expected actions were dispatched, check the calls made
 *     to the `fakeConnectStore.dispatch` stub.
 */
function fakeConnectStore(initialState) {
  var state = initialState || {};
  var dispatch = sinon.stub();
  var controller;
  var mapFn;

  function updateState(changes) {
    var newState = Object.assign(state, changes);
    Object.assign(controller, mapFn(newState, dispatch));
  }

  function connect(controller_, mapFn_) {
    controller = controller_;
    mapFn = mapFn_;
    updateState({});
  }

  connect.dispatch = dispatch;
  connect.updateState = updateState;

  return connect;
}

module.exports = fakeConnectStore;
