(function(angular) {
  'use strict';

  angular.module('linagora.esn.resource')
    .controller('esnResourceIconPickerController', esnResourceIconPickerController);

  function esnResourceIconPickerController($modal, ESN_RESOURCE) {
    var self = this;

    self.RESOURCE_ICONS = ESN_RESOURCE.ICONS;
    self.iconKeys = Object.keys(self.RESOURCE_ICONS);
    self.set = set;
    self.select = select;
    self.isSelected = isSelected;
    self.openModal = openModal;

    ////////////

    function set() {
      if (self.selected) {
        self.icon = self.selected;
      }
    }

    function select(icon) {
      self.selected = icon;
    }

    function isSelected(icon) {
      return self.selected === icon;
    }

    function openModal() {
      self.selected = self.icon;

      $modal({
        templateUrl: '/linagora.esn.resource/app/components/resource-icon-picker/modal/resource-icon-picker-modal.html',
        controller: function($scope) {
          angular.extend($scope, self);
        },
        backdrop: 'static',
        placement: 'center'
      });
    }
  }
})(angular);
