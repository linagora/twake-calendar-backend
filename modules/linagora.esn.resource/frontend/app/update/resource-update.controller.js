(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .controller('ESNResourceUpdateModalController', ESNResourceUpdateModalController);

  function ESNResourceUpdateModalController($modal) {
    var self = this;

    self.openResourceUpdateModal = openResourceUpdateModal;

    function openResourceUpdateModal() {
      $modal({
        templateUrl: '/linagora.esn.resource/app/components/resource-form-modal/resource-form-modal.html',
        controller: 'ESNResourceFormUpdateController',
        backdrop: 'static',
        placement: 'center',
        controllerAs: 'ctrl',
        locals: {
          resource: self.resource,
          type: self.type
        }
      });
    }
  }
})(angular);
