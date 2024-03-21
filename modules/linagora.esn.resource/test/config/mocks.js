'use strict';

angular.module('esn.form.helper', []);
angular.module('esn.session', [])
  .factory('session', function($q) {
    return {
      ready: $q.when(),
      user: {},
      domain: {},
      userIsDomainAdministrator: function() {
        return false;
      }
    };
  });
