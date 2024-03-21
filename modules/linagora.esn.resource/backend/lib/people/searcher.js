const Q = require('q');

module.exports = dependencies => {
  const searchLib = require('../search')(dependencies);
  const resourceLib = require('../resource')(dependencies);
  const logger = dependencies('logger');

  return ({ term, context, pagination }) => {
    const query = {
      search: term,
      limit: pagination.limit,
      userId: String(context.user._id),
      domainId: String(context.domain._id)
    };

    return searchLib.search(query)
      .then(searchResult => searchResult.list.map(resource => resourceLib.get(resource._id)))
      .then(promises => Q.allSettled(promises))
      .then(resolvedResources => resolvedResources.filter(_ => _.state === 'fulfilled').map(_ => _.value))
      .then(resources => resources.filter(Boolean))
      .then(resources => (resources || []))
      .catch(err => {
        logger.error('Failed to search for resources', err);
        throw err;
      });
  };
};
