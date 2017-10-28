'use strict';

function init() {
  return {
    // Map of link name to URL template returned by the API's "links" route.
    links: null,
  };
}

var update = {
  UPDATE_LINKS: (state, action) => {
    return { links: action.newLinks };
  },
};


/** Return an action object for updating the links to the given newLinks. */
function updateLinks(newLinks) {
  return { type: 'UPDATE_LINKS', newLinks: newLinks };
}

module.exports = {
  init,
  update,
  actions: {
    updateLinks,
  },
  selectors: {},
};
