const cors = require('cors');

const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;

const moduleData = {
  shortName: 'dav',
  fullName: 'linagora.esn.davproxy',
  angularModules: []
};

const davProxy = new AwesomeModule(moduleData.fullName, {
  dependencies: [
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.logger', 'logger'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.auth', 'auth'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.esn-config', 'esn-config'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.pubsub', 'pubsub'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.helpers', 'helpers'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.authorization', 'authorizationMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.helper', 'helperMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.token', 'tokenMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.davserver', 'davserver'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.contact', 'contact')
  ],
  data: moduleData,
  states: {
    lib: function(dependencies, callback) {
      const addressbooks = require('./backend/webserver/addressbooks')(dependencies);
      const calendars = require('./backend/webserver/calendars')(dependencies);
      const principals = require('./backend/webserver/principals')(dependencies);
      const json = require('./backend/webserver/json')(dependencies);

      const lib = {
        api: {
          addressbooks,
          calendars,
          principals,
          json
        }
      };

      return callback(null, lib);
    },

    deploy: function(dependencies, callback) {
      var app = require('./backend/webserver/application')(dependencies);

      app.all('/api/*', cors({
        origin: true,
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,REPORT,PROPFIND,PROPPATCH,MOVE'
      }));
      app.use('/api/addressbooks', this.api.addressbooks);
      app.use('/api/calendars', this.api.calendars);
      app.use('/api/principals', this.api.principals);
      app.use('/api/json', this.api.json);

      return callback();
    },

    start: function(dependencies, callback) {
      callback();
    }
  },

  abilities: ['davproxy']
});

module.exports = davProxy;
