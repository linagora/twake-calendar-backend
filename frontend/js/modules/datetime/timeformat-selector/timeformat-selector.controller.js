(function(angular) {
  'use strict';

  angular.module('esn.datetime')
    .controller('esnDatetimeTimeFormatSelectorController', esnDatetimeTimeFormatSelectorController);

  function esnDatetimeTimeFormatSelectorController(ESN_DATETIME_TIME_FORMATS) {
    var self = this;

    self.$onInit = $onInit;

    function $onInit() {
      self.currentDate = new Date();

      self.ESN_DATETIME_TIME_FORMATS = ESN_DATETIME_TIME_FORMATS;
    }
  }
})(angular);
