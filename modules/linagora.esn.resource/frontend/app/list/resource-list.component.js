(function() {
  'use strict';

  angular.module('linagora.esn.resource')
    .component('esnResourceList', {
      bindings: {
        type: '='
      },
      controllerAs: 'ctrl',
      controller: 'ESNResourceListController',
      templateUrl: '/linagora.esn.resource/app/list/resource-list.html'
    });
})();
