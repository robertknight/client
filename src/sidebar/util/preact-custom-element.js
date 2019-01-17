'use strict';

const { h, render } = require('preact');

const EmptyComponent = () => null;

/**
 * Wrap a Preact component as a custom element so it can be easily used from
 * other web frameworks or vanilla JS.
 *
 * @param {Object} component - The Preact component class or function
 * @param {Object} spec - Specification of the properties and events to expose
 * @return {Object} - An `HTMLElement` subclass which can be registered as
 *   a custom element using `window.customElements.define`
 */
function createCustomElement(component, spec) {
  const events = spec.events || [];
  const properties = spec.properties || {};

  // Define the basic custom element class for this component.
  const eventCallbacks = {};
  class WrapperElement extends HTMLElement {
    constructor() {
      super();

      this.props = {};

      // The rendered Preact element.
      this._root = null;

      // Set initial values for properties.
      Object.keys(properties).forEach(prop => {
        this.props[prop] = properties[prop].initialValue;
      });

      // Setup event callbacks.
      Object.keys(eventCallbacks).forEach(eventName => {
        // If the event is `eventName` the property is `onEventName`.
        const propName = 'on' + eventName.slice(0, 1).toUpperCase() + eventName.slice(1);
        this.props[propName] = eventCallbacks[eventName].bind(this);
      });
    }

    connectedCallback() {
      this.render();
    }

    detachedCallback() {
      this._root = render(EmptyComponent, this, this._root);
    }

    /**
     * Update the DOM to match the current props.
     */
    render() {
      try {
        const el = h(component, this.props);
        this._root = render(el, this, this._root);
      } catch (err) {
        console.error(`Error rendering ${component.name}`, err);
        this.innerHTML = `
        <div style="background-color: #aa0000; color: white; font-weight: bold; padding: 3px">
         &#x26A0; Error in ${component.name}
        </div>`;
      }
    }
  }

  // Add properties to the class that correspond to each of the component's
  // inputs.
  Object.keys(properties).forEach(prop => {
    const descriptor = {
      get() {
        return this.props[prop];
      },

      set(value) {
        this.props[prop] = value;
        this.render();
      },

      enumerable: true,
    };
    Object.defineProperty(WrapperElement.prototype, prop, descriptor);
  });

  // Create event handlers that map `on<event>` properties of the component
  // to DOM events.
  events.forEach(eventName => {
    function emitEvent(value) {
      const event = new Event(eventName);
      event.detail = value;
      this.dispatchEvent(event);
    }
    eventCallbacks[eventName] = emitEvent;
  });

  return WrapperElement;
}

module.exports = createCustomElement;
