(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .component('esnResourceCreateModal', {
      bindings: {
        type: '=?'
      },
      controller: ComponentController,
      controllerAs: 'ctrl',
      transclude: true,
      templateUrl: '/linagora.esn.resource/app/create/resource-create.html'
    });

    function ComponentController($modal) {
      var self = this;

      self.openResourceCreateModal = openResourceCreateModal;

      function openResourceCreateModal() {
        $modal({
          templateUrl: '/linagora.esn.resource/app/components/resource-form-modal/resource-form-modal.html',
          controller: 'ESNResourceFormCreateController',
          backdrop: 'static',
          placement: 'center',
          controllerAs: 'ctrl',
          resolve: {
            type: function() { return self.type; }
          }
        });
      }
    }
})(angular);
