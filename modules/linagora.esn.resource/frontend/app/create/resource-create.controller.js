(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .controller('ESNResourceCreateModalController', ESNResourceCreateModalController);

  function ESNResourceCreateModalController($modal) {
    var self = this;

    self.openResourceCreateModal = openResourceCreateModal;

    function openResourceCreateModal() {
      $modal({
        templateUrl: '/linagora.esn.resource/app/components/resource-form-modal/resource-form-modal.html',
        controller: 'ESNResourceFormCreateController',
        backdrop: 'static',
        placement: 'center',
        controllerAs: 'ctrl',
        locals: {
          type: self.type
        }
      });
    }
  }
})(angular);
