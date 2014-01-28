'use strict';

angular.module('setupApp', []).controller('wizardController', ['$scope', 'setupAPI', function($scope, setupAPI) {
  $scope.settings = {};
  $scope.settings.hostname = null;
  $scope.settings.port = null;
  $scope.settings.dbname = null;
  $scope.step = 0;
  $scope.test = {
    running: false,
    status: 'none',
    err: null
  };
  $scope.record = {
    status: 'none',
    err: null,
    running: false
  };

  $scope.testButton = {
    label: 'Test connection',
    notRunning: 'Test connection',
    running: 'Testing database connection...'
  };

  $scope.recordButton = {
    label: 'Next',
    notRunning: 'Next',
    running: 'Recording settings on the server...'
  };

  function onError(data, err, type) {
    $scope[type].status = 'error';
    if (data.error && data.reason) {
      $scope[type].err = data;
    } else {
      $scope[type].err = {
        error: err,
        reason: data
      };
    }
  }

  $scope.ajaxRunning = function() {
    return $scope.record.running || $scope.test.running ? true : false;
  };

  $scope.infocomplete = function() {
    return $scope.settings.hostname && $scope.settings.port && $scope.settings.dbname ? true : false;
  };

  $scope.testConnection = function() {
    if ($scope.ajaxRunning()) {
      return;
    }
    $scope.test.running = true;
    $scope.testButton.label = $scope.testButton.running;
    setupAPI.testConnection($scope.settings.hostname, $scope.settings.port, $scope.settings.dbname)
      .success(function() {
        $scope.test.status = 'success';
      })
      .error(function(data, err) {
        onError(data, err, 'test');
      })
      .finally (function() {
        $scope.test.running = false;
        $scope.testButton.label = $scope.testButton.notRunning;
      });
  };

  $scope.recordSettings = function() {
    if ($scope.ajaxRunning()) {
      return;
    }
    $scope.record.running = true;
    $scope.recordButton.label = $scope.recordButton.running;
    setupAPI.recordSettings($scope.settings)
      .success(function() {
        $scope.step++;
      })
      .error(function(data, err) {
        onError(data, err, 'record');
      })
      .finally (function() {
        $scope.record.running = false;
        $scope.recordButton.label = $scope.recordButton.notRunning;
      });
  };

}]).service('setupAPI', ['$http', function($http) {

    function testConnection(hostname, port, dbname) {
      var url = '/api/setup/database/test/connection/' +
                encodeURIComponent(hostname) + '/' +
                encodeURIComponent(port) + '/' +
                encodeURIComponent(dbname);
      return $http.get(url);
    }

    function recordSettings(settings) {
      return $http.put('/api/setup/settings', settings);
    }

    return {
      testConnection: testConnection,
      recordSettings: recordSettings
    };
  }
]);
