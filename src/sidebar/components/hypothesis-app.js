'use strict';

var AppController = require('../app-controller');

module.exports = {
  controller: AppController,
  controllerAs: 'vm',
  bindings: {},
  template: require('../templates/hypothesis_app.html'),
};
