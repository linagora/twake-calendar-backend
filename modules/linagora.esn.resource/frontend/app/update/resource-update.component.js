(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .component('esnResourceUpdateModal', {
      bindings: {
        resource: '=',
        type: '=?'
      },
      controller: 'ESNResourceUpdateModalController',
      controllerAs: 'ctrl',
      transclude: true,
      templateUrl: '/linagora.esn.resource/app/update/resource-update.html'
    });
})(angular);
