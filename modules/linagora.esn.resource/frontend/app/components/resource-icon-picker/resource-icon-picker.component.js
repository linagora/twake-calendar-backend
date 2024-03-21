(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .component('esnResourceIconPicker', {
      templateUrl: '/linagora.esn.resource/app/components/resource-icon-picker/resource-icon-picker.html',
      bindings: {
        icon: '=?'
      },
      controller: 'esnResourceIconPickerController',
      controllerAs: 'ctrl'
    });
})(angular);
