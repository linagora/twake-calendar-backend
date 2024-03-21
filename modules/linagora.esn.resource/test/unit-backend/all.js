const mockery = require('mockery');
const chai = require('chai');
const path = require('path');
const helpers = require('linagora-rse').test.helpers;
const backendPath = path.normalize(__dirname + '/../../backend');

before(function() {
  chai.use(require('chai-shallow-deep-equal'));
  chai.use(require('sinon-chai'));
  chai.use(require('chai-as-promised'));

  const basePath = path.resolve(__dirname + '/../../node_modules/linagora-rse');

  this.testEnv = {
    basePath: basePath,
    backendPath: backendPath,
    fixtures: path.resolve(__dirname + '/fixtures'),
    initCore: function(callback) {
      const core = require(basePath + '/backend/core');

      core.init();
      if (callback) {
        callback();
      }

      return core;
    }
  };
  this.helpers = {};
  helpers(this.helpers, this.testEnv);
});

beforeEach(function() {
  mockery.enable({warnOnReplace: false, warnOnUnregistered: false, useCleanCache: true});
  const depsStore = {
    logger: require('./fixtures/logger-noop'),
    errors: require('./fixtures/errors')
  };
  const dependencies = name => depsStore[name];
  const addDep = (name, dep) => {
    depsStore[name] = dep;
  };

  this.moduleHelpers = {
    modulePath: path.resolve(__dirname + '/../../'),
    backendPath: backendPath,
    addDep: addDep,
    dependencies: dependencies
  };
});

afterEach(function() {
  mockery.resetCache();
  mockery.deregisterAll();
  mockery.disable();
});
