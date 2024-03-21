(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .component('esnResourceAdministratorListItemUser', {
        bindings: {
        administrator: '=',
        onRemove: '<'
        },
        controllerAs: 'ctrl',
        controller: 'ESNResourceAdministratorListItemUserController',
        templateUrl: '/linagora.esn.resource/app/list-administrator/item/user/resource-administrator-list-item-user.html'
    });
})(angular);
