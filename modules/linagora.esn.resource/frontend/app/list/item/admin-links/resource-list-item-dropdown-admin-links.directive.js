(function(angular) {
    'use strict';

    angular.module('linagora.esn.resource')
      .directive('esnResourceListItemDropdownAdminLinks', function() {
        return {
          restrict: 'E',
          templateUrl: '/linagora.esn.resource/app/list/item/admin-links/resource-list-item-dropdown-admin-links.html'
        };
      });
  })(angular);
