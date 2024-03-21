(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .component('esnResourceAdministratorListItem', {
      bindings: {
        administrator: '=',
        onRemove: '='
      },
      controllerAs: 'ctrl',
      templateUrl: '/linagora.esn.resource/app/list-administrator/item/resource-administrator-list-item.html'
    });
})(angular);
