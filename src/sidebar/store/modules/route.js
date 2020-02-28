import { actionTypes } from '../util';

function init() {
  return {
    name: null,
    params: {},
  };
}

const update = {
  CHANGE_ROUTE(state, { name, params }) {
    return { name, params };
  },
};

const actions = actionTypes(update);

function changeRoute(name, params = {}) {
  return {
    type: actions.CHANGE_ROUTE,
    name,
    params,
  };
}

function route(state) {
  return state.route.name;
}

function routeParams(state) {
  return state.route.params;
}

export default {
  init,
  namespace: 'route',
  update,
  actions: {
    changeRoute,
  },
  selectors: {
    route,
    routeParams,
  },
};
