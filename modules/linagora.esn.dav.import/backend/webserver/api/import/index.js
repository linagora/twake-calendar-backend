'use strict';

module.exports = function(dependencies, lib, router) {
  const authorizationMW = dependencies('authorizationMW');
  const controller = require('./controller')(dependencies, lib);
  const middleware = require('./middleware')(dependencies, lib);

  router.post('/import',
    authorizationMW.requiresAPILogin,
    middleware.validateImportRequest,
    middleware.loadFileMetaData,
    middleware.validateFileType,
    middleware.validateTarget,
    controller.importFromFile);
};
