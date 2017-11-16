'use strict';

function init() {
  // Map of link name to URL template returned by the API's "links" route.
  return {};
}

var update = {
  UPDATE_LINKS: (state, action) => {
    return action.newLinks;
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

  isModule: true,
};
