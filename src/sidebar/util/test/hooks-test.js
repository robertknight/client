'use strict';

const { createElement, render } = require('preact');
const { useEffect } = require('preact/hooks');

const { useTransition } = require('../hooks');

function AnimatedWidget({ states, afterLeave }) {
  const { isEntering, isLeaving, leave } = useTransition({
    exitDelay: 2,
    afterLeave,
  });

  useEffect(() => {
    setTimeout(() => leave('foobar'), 5);
  }, []);

  states.push({ isEntering, isLeaving });
  return null;
}

describe('hooks', () => {
  describe('useTransition', () => {
    it('produces expected transitions', done => {
      const states = [];
      const afterLeave = sinon.stub();

      render(
        <AnimatedWidget states={states} afterLeave={afterLeave} />,
        document.createElement('div')
      );

      setTimeout(() => {
        assert.deepEqual(states, [
          {
            isEntering: true,
            isLeaving: false,
          },
          {
            isEntering: false,
            isLeaving: false,
          },
          {
            isEntering: false,
            isLeaving: true,
          },
        ]);
        done();
      }, 20);
    });

    it('calls `afterLeave` callback', done => {
      const afterLeave = sinon.stub();

      render(
        <AnimatedWidget states={[]} afterLeave={afterLeave} />,
        document.createElement('div')
      );

      assert.notCalled(afterLeave);

      setTimeout(() => {
        assert.calledOnce(afterLeave);
        assert.calledWith(afterLeave, 'foobar');
        done();
      }, 20);
    });
  });
});
