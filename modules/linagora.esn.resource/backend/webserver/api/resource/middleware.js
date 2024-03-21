module.exports = dependencies => {
  const logger = dependencies('logger');
  const resourceLib = require('../../../lib/resource')(dependencies);
  const administatorLib = require('../../../lib/administrator')(dependencies);

  return {
    canCreateResource,
    canReadResource,
    canUpdateResource,
    canDeleteResource,
    load,
    validateAdministrators
  };

  function canCreateResource(req, res, next) {
    next();
  }

  function canReadResource(req, res, next) {
    if (req.resource.domain._id.toString() === req.domain._id.toString()) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: 403,
        message: 'Forbidden',
        details: `You do not have required permission on resource ${req.resource.id}`
      }
    });
  }

  function canUpdateResource(req, res, next) {
    if (!userIsResourceCreator(req.user, req.resource)) {
      return res.status(403).json({error: {code: 403, message: 'Forbidden', details: `You can not update resource ${req.resource.id}`}});
    }

    next();
  }

  function canDeleteResource(req, res, next) {
    if (!userIsResourceCreator(req.user, req.resource)) {
      return res.status(403).json({error: {code: 403, message: 'Forbidden', details: `You can not delete resource ${req.resource.id}`}});
    }

    next();
  }

  function load(req, res, next) {
    resourceLib.get(req.params.id).then(result => {
      if (!result) {
        return res.status(404).json({error: {code: 404, message: 'Not found', details: `Resource ${req.params.id} can not be found`}});
      }

      req.resource = result;
      next();
    }).catch(err => {
      const details = `Error while loading the resource with id ${req.params.id}`;

      logger.error(details, err);
      res.status(500).json({error: {status: 500, message: 'Server Error', details}});
    });
  }

  function userIsResourceCreator(user, resource) {
    return user._id.equals(resource.creator);
  }

  function validateAdministrators(req, res, next) {
    req.body.administrators = req.body.administrators || [];

    if (!Array.isArray(req.body.administrators)) {
      return res.status(400).json({error: {status: 400, message: 'Bad request', details: 'administrators must be an array'}});
    }

    Promise.all(req.body.administrators.map(administatorLib.validateTuple))
      .then(() => next())
      .catch(err => {
        const details = 'One or more administrators are invalid';

        logger.error(details, err);
        res.status(400).json({error: {status: 400, message: 'Bad request', details}});
      });
  }
};
