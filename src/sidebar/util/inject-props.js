'use strict';

const { createElement } = require('preact');

function resolveServices($injector, serviceNames) {
  const services = {};
  serviceNames.forEach(name => {
    const service = $injector.get(name);
    services[name] = service;
  });
  return services;
}

/**
 * The singleton Angular service injector used by `injectProps` to resolve
 * Angular services.
 */
let $injector;

/**
 * Configure the service injector to be used when components wrapped with
 * `injectProps` are rendered.
 */
function setInjector($injector_) {
  $injector = $injector_;
}

/**
 * Wrap a React component to resolve AngularJS service dependencies.
 *
 * Use this to render a React component which depends on AngularJS services,
 * from within another React component, without the parent React component
 * having to pass along the services itself.
 *
 * Before any wrapped component is rendered for the first time, the AngularJS
 * `$injector` service to use must be configured by calling `setInjector`.
 * This is typically done in the bootstrap of the AngularJS app (eg. in a
 * "run block").
 *
 * @param {Function} type -
 *   React component type. This should have an `injectedProps` property which
 *   lists the names of the services to inject.
 * @return {Function} - Wrapper component
 */
function injectProps(type) {
  const serviceNames = type.injectedProps;
  let services = null;

  function AngularServiceInjector(props) {
    if (services === null) {
      if (!$injector) {
        throw new Error('Service injector has not been configured.');
      }
      services = resolveServices($injector, serviceNames);
    }
    return createElement(type, { ...services, ...props });
  }
  AngularServiceInjector.displayName = `AngularServiceInjector(${type.name})`;
  return AngularServiceInjector;
}

module.exports = {
  injectProps,
  setInjector,
};
