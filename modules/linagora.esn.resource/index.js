'use strict';


const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;
const MODULE_NAME = 'linagora.esn.resource';

module.exports = new AwesomeModule(MODULE_NAME, {
  dependencies: [
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.user', 'user'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.db', 'db'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.collaboration', 'collaboration'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.elasticsearch', 'elasticsearch'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.logger', 'logger'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.pubsub', 'pubsub'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.people', 'people'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.authorization', 'authorizationMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.domain', 'domainMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.i18n', 'i18n')
  ],

  states: {
    lib: function(dependencies, callback) {
      const lib = require('./backend/lib')(dependencies);
      const api = require('./backend/webserver/api')(dependencies);

      return callback(null, {
        api, lib
      });
    },

    deploy: function(dependencies, callback) {
      const webserverWrapper = dependencies('webserver-wrapper');
      const app = require('./backend/webserver/application')(dependencies);

      app.use('/api', this.api);

      webserverWrapper.addApp(MODULE_NAME, app);

      callback();
    },

    start: function(dependencies, callback) {
      this.lib.start(callback);
    }
  }
});
