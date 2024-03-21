(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource').component('esnResourceAvatar', {
    bindings: {
      resource: '<'
    },
    controllerAs: 'ctrl',
    controller: 'esnResourceAvatarController',
    templateUrl: '/linagora.esn.resource/app/avatar/resource-avatar.html'
  });
})(angular);
