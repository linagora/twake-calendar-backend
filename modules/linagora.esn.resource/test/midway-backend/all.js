/* eslint-disable no-console, no-process-env */

const Q = require('q');
const chai = require('chai');
const path = require('path');
const EsConfig = require('esn-elasticsearch-configuration');
const testConfig = require('../config/servers-conf');
const basePath = path.resolve(__dirname + '/../../node_modules/linagora-rse');
const backendPath = path.normalize(__dirname + '/../../backend');
const MODULE_NAME = 'linagora.esn.resource';

process.env.NODE_CONFIG = 'test/config';
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'redis';
process.env.REDIS_PORT = 6379;
process.env.AMQP_HOST = 'rabbitmq';
process.env.ES_HOST = 'elasticsearch';

const esConf = new EsConfig(testConfig.elasticsearch);

before(function(done) {
  let rse;

  chai.use(require('chai-shallow-deep-equal'));
  chai.use(require('sinon-chai'));
  chai.use(require('chai-as-promised'));
  chai.use(require('chai-datetime'));

  this.testEnv = {
    serversConfig: testConfig,
    basePath: basePath,
    backendPath: backendPath,
    fixtures: path.resolve(basePath, 'test/midway-backend/fixtures'),
    mongoUrl: testConfig.mongodb.connectionString,
    initCore(callback = () => {}) {
      rse.core.init(() => process.nextTick(callback));
    }
  };

  rse = require('linagora-rse');
  this.helpers = {};
  this.testEnv.core = rse.core;
  this.testEnv.moduleManager = rse.moduleManager;
  rse.test.helpers(this.helpers, this.testEnv);
  rse.test.moduleHelpers(this.helpers, this.testEnv);
  rse.test.apiHelpers(this.helpers, this.testEnv);

  const manager = this.testEnv.moduleManager.manager;
  const nodeModulesPath = path.normalize(
    path.join(__dirname, '../../node_modules/')
  );

  const loader = manager.loaders.code(require('../../index.js'), true);
  const nodeModulesLoader = manager.loaders.filesystem(nodeModulesPath, true);

  manager.appendLoader(loader);
  manager.appendLoader(nodeModulesLoader);

  loader.load(MODULE_NAME, done);
});

before(function(done) {
  const self = this;

  self.helpers.modules.initMidway(MODULE_NAME, self.helpers.callbacks.noErrorAnd(() => {
    const expressApp = require(`${self.testEnv.backendPath}/webserver/application`)(self.helpers.modules.current.deps);

    expressApp.use('/api', this.helpers.modules.current.lib.api);
    self.app = self.helpers.modules.getWebServer(expressApp);

    self.helpers.modules.current.lib.lib.start(err => done(err));
  }));
});

beforeEach(function(done) {
  Q.all([
    esConf.setup('resources.idx', 'resources')
  ])
  .then(() => done())
  .catch(err => {
    console.error('Error while setup ES indices', err);
    done();
  });
});

afterEach(function(done) {
  Q.all([
    esConf.deleteIndex('real.resources.idx')
  ])
  .then(() => done())
  .catch(err => {
    console.error('Error while clear ES indices', err);
    done();
  });
});

afterEach(function(done) {
  this.helpers.mongo.dropDatabase(err => done(err));
});
