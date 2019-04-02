'use strict';

const angular = require('angular');
const propTypes = require('prop-types');
const { mount } = require('enzyme');
const { createElement, render } = require('preact');

const { setInjector, injectProps } = require('../inject-props');

describe('injectProps', () => {
  let App;
  let Button;

  before(() => {
    angular
      .module('app', [])
      .value('theme', 'dark')
      .value('lang', 'en-US');
  });

  beforeEach(() => {
    angular.mock.module('app');
    angular.mock.inject($injector => {
      setInjector($injector);
    });

    // Re-create the components for each test case, because looked-up services
    // are cached for each wrapped type.
    //
    // eslint-disable-next-line
    Button = function Button({ theme, label, lang }) {
      return (
        <button className={theme} lang={lang}>
          {label}
        </button>
      );
    };
    Button.propTypes = {
      theme: propTypes.string,
      label: propTypes.string,
      lang: propTypes.string,
    };
    Button.injectedProps = ['lang', 'theme'];
    Button = injectProps(Button, 'app');

    App = function App() {
      return <Button lang="fr" label="Click me" />;
    };
  });

  it('forwards props from parent', () => {
    const wrapper = mount(<App />);
    assert.equal(wrapper.find('button').text(), 'Click me');
  });

  it('resolves props from Angular services', () => {
    const wrapper = mount(<App />);
    assert.isTrue(wrapper.find('button').hasClass('dark'));
  });

  it('allows props from parent to override Angular services', () => {
    const wrapper = mount(<App />);
    assert.equal(wrapper.find('button').prop('lang'), 'fr');
  });

  it('throws when rendering if injector is not configured', () => {
    // "Un-configure" the injector.
    setInjector(null);
    assert.throws(() => {
      render(<App />, document.createElement('div'));
    });
  });
});
