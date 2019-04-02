'use strict';

const { useEffect, useState } = require('preact/hooks');

/**
 * @typedef TransitionState
 * @prop {boolean} isEntering -
 *   Set to true when the transition begins and then
 *   false one frame later later.
 * @prop {boolean} isLeaving -
 *   Set to `true` after `leave` is called
 * @prop {Function} leave -
 *   A callback to begin the "leave" animation. After the animation completes,
 *   the `afterLeave` function will be called.
 */

/**
 * @typedef TransitionParams
 * @prop {number} leaveDelay -
 *   Length of leaving animation in milliseconds. The actual animation can be
 *   shorter, but cleanup will happen after this time has elapsed.
 * @prop {Function} afterLeave -
 *   A function to call after the leave animation completes. Any arguments
 *   passed to the returned `leave` function will be forwarded to this one.
 */

/**
 * React hook to help with implementing enter and leave transitions.
 *
 * @param {TransitionParams} options
 * @return {TransitionState}
 */
function useTransition({ leaveDelay, afterLeave }) {
  const [state, setState] = useState('entering');
  const leave = (...args) => {
    if (state === 'leaving') {
      return;
    }

    setState('leaving');

    // Trigger cleanup once animation finishes. A hard timeout is used rather
    // than listening for CSS transition end events because there are scenarios
    // where those events do not fire.
    setTimeout(() => afterLeave(...args), leaveDelay);
  };

  if (state === 'entering') {
    // Wait for the component to be rendered at least once in the initial
    // "entering" state before transitioning to the "entered" state.
    //
    // Waiting for a render ensures that CSS transitions are triggered.
    // Alternate approaches such as waiting for a timeout are not reliable as
    // the component may not be rendered in that time (eg. if the browser is busy).
    useEffect(() => {
      setState('entered');
    }, []);
  }

  return {
    isEntering: state === 'entering',
    isLeaving: state === 'leaving',
    leave,
  };
}

module.exports = {
  useTransition,
};
