(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .factory('esnResourceAttendeeProvider', esnResourceAttendeeProvider);

  function esnResourceAttendeeProvider(ESN_RESOURCE_OBJECT_TYPE) {
    return {
      objectType: ESN_RESOURCE_OBJECT_TYPE,
      templateUrl: '/linagora.esn.resource/app/attendee-provider/attendee-template.html'
    };
  }
})(angular);
