'use strict';

var express = require('express');

module.exports = dependencies => {
  const controller = require('./controller')(dependencies);
  const middleware = require('./middleware')(dependencies);
  const authorizationMW = dependencies('authorizationMW');
  const domainMW = dependencies('domainMW');
  const router = express.Router();

  router.post('/',
    authorizationMW.requiresAPILogin,
    domainMW.loadSessionDomain,
    authorizationMW.requiresDomainManager,
    middleware.canCreateResource,
    middleware.validateAdministrators,
    controller.create);

  router.get('/',
    authorizationMW.requiresAPILogin,
    domainMW.loadSessionDomain,
    controller.list);

  router.get('/:id',
    authorizationMW.requiresAPILogin,
    domainMW.loadSessionDomain,
    middleware.load,
    middleware.canReadResource,
    controller.get);

  router.delete('/:id',
    authorizationMW.requiresAPILogin,
    domainMW.loadSessionDomain,
    authorizationMW.requiresDomainManager,
    middleware.load,
    controller.remove);

  router.put('/:id',
    authorizationMW.requiresAPILogin,
    domainMW.loadSessionDomain,
    authorizationMW.requiresDomainManager,
    middleware.load,
    controller.update);

  return router;
};
