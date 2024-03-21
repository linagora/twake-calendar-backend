(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .component('esnResourceListItem', {
      bindings: {
        resource: '<'
      },
      controllerAs: 'ctrl',
      controller: 'esnResourceListItemController',
      templateUrl: '/linagora.esn.resource/app/list/item/resource-list-item.html'
    });
})(angular);
