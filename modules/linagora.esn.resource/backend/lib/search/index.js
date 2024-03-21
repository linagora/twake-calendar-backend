const { SEARCH } = require('../constants');

module.exports = dependencies => {
  const elasticsearch = dependencies('elasticsearch');
  const searchHandler = require('./searchHandler')(dependencies);
  const reindex = require('./reindex')(dependencies);
  const logger = dependencies('logger');

  return {
    search,
    listen
  };

  function search(query) {
    return _searchResources({
      multi_match: {
        query: query.search,
        type: 'cross_fields',
        fields: [
          'name',
          'description'
        ],
        operator: 'and',
        tie_breaker: 0.5
      }
    }, query);
  }

  function _searchResources(esQuery, query) {
    const offset = query.offset || 0;
    const limit = 'limit' in query ? query.limit : SEARCH.DEFAULT_LIMIT;
    const sortKey = query.sortKey || SEARCH.DEFAULT_SORT_KEY;
    const sortOrder = query.sortOrder || SEARCH.DEFAULT_SORT_ORDER;
    const filters = [];
    const sort = {};
    const mustNotSearchDeletedResource = {
      match: {
        deleted: true
      }
    };

    sort[sortKey] = {
      order: sortOrder
    };

    const elasticsearchQuery = {
      query: {
        bool: {
          must: esQuery
        }
      },
      sort: sort
    };

    if (query.domainId) {
      filters.push({
        term: {
          domain: query.domainId.toString()
        }
      });
    }

    if (!query.deleted) {
      elasticsearchQuery.query.bool.must_not = elasticsearchQuery.query.bool.must_not ?
        Object.assign(
          elasticsearchQuery.query.bool.must_not,
          mustNotSearchDeletedResource
        ) :
        mustNotSearchDeletedResource;
    }

    if (filters.length) {
      elasticsearchQuery.query.bool.filter = filters;
    }

    logger.debug('Searching resources with options', {
      domainId: query.domainId,
      query: elasticsearchQuery.query,
      offset,
      limit,
      sort
    });

    return new Promise((resolve, reject) => {
      elasticsearch.searchDocuments({
        index: SEARCH.INDEX_NAME,
        type: SEARCH.TYPE_NAME,
        from: offset,
        size: limit,
        body: elasticsearchQuery
      }, (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve({
          total_count: result.hits.total,
          list: result.hits.hits
        });
      });
    });
  }

  function listen() {
    logger.info('Subscribing to event updates for indexing');
    searchHandler.register();
    logger.info('Register resource reindexing mechanism in elasticsearch');
    reindex.register();
  }
};
