'use strict';

const MODULE_DIR_NAME = '/linagora.esn.resource';

module.exports = function(config) {
  config.set({
    basePath: '../../',
    files: [
      'frontend/components/chai/chai.js',
      'node_modules/chai-shallow-deep-equal/chai-shallow-deep-equal.js',
      'frontend/components/jquery/dist/jquery.min.js',
      'frontend/components/angular/angular.min.js',
      'frontend/components/angular-ui-router/release/angular-ui-router.min.js',
      'frontend/components/ui-router-extras/release/ct-ui-router-extras.min.js',
      'frontend/components/angular-mocks/angular-mocks.js',
      'frontend/components/dynamic-directive/dist/dynamic-directive.min.js',
      'frontend/components/angular-component/dist/angular-component.min.js',
      'frontend/components/angular-strap/dist/angular-strap.js',
      'frontend/components/angular-strap/dist/angular-strap.tpl.js',
      'frontend/components/restangular/dist/restangular.min.js',
      'frontend/components/lodash/dist/lodash.min.js',
      'frontend/components/ng-tags-input/ng-tags-input.js',
      'frontend/components/angular-translate/angular-translate.min.js',
      'frontend/components/sinon-chai/lib/sinon-chai.js',
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/linagora-rse/frontend/js/modules/**/*.module.js',
      'node_modules/linagora-rse/frontend/js/modules/**/*.js',
      'node_modules/linagora-rse/frontend/js/*.js',
      'node_modules/linagora-rse/test/fixtures/code-generation/**/*.js',
      'node_modules/linagora-rse/frontend/views/modules/**/*.pug',
      { pattern: 'node_modules/linagora-rse/frontend/js/modules/i18n/i18n.config.js', watched: false, included: false, served: true },
      { pattern: 'frontend/images/*.*', watched: false, included: false, served: true },
      { pattern: 'frontend/components/mdi/fonts/*.*', watched: false, included: false, served: true },
      'frontend/app/app.js',
      'frontend/app/**/*.js',
      'frontend/app/**/*.pug',
      'frontend/app/*.js',
      'test/config/mocks.js'
    ],
    exclude: [
      'frontend/app/resource.run.js',
      'node_modules/linagora-rse/frontend/js/**/*.spec.js',
      'node_modules/linagora-rse/frontend/js/**/*.run.js'
    ],
    frameworks: ['mocha'],
    colors: true,
    singleRun: true,
    autoWatch: true,
    browsers: ['PhantomJS', 'Chrome', 'Firefox'],
    reporters: ['coverage', 'spec'],
    preprocessors: {
      'frontend/app/**/*.js': ['coverage'],
      '**/*.pug': ['ng-jade2module']
    },

    plugins: [
      'karma-phantomjs-launcher',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-coverage',
      'karma-spec-reporter',
      '@linagora/karma-ng-jade2module-preprocessor'
    ],

    coverageReporter: {type: 'text', dir: '/tmp'},

    ngJade2ModulePreprocessor: {
      stripPrefix: 'frontend',
      prependPrefix: MODULE_DIR_NAME,
      // setting this option will create only a single module that contains templates
      // from all the files, so you can load them all with module('templates')
      cacheIdFromPath: function(filepath) {
        return filepath
          .replace(/pug$/, 'html')
          .replace(/^frontend/, MODULE_DIR_NAME)
          .replace(/^node_modules\/linagora-rse\/frontend/, '');
      },
      jadeRenderOptions: {
        basedir: require('path').resolve(__dirname, '../../node_modules/linagora-rse/frontend/views')
      },
      jadeRenderLocals: {
        __: function(str) {
          return str;
        }
      },
      moduleName: 'jadeTemplates'
    }

  });
};
