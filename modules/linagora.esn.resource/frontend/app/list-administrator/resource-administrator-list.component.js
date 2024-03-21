(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .component('esnResourceAdministratorList', {
      bindings: {
        administrators: '=',
        onRemove: '='
      },
      controllerAs: 'ctrl',
      templateUrl: '/linagora.esn.resource/app/list-administrator/resource-administrator-list.html'
    });
})(angular);
