const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');
const _ = require('lodash');

describe('The search lib', function() {
  let total, offset, limit, hits, query;
  let pubsubListen, logger, elasticsearch;

  beforeEach(function() {
    logger = {
      error: () => {},
      debug: () => {},
      info: () => {},
      warning: () => {}
    };
    elasticsearch = {};

    this.moduleHelpers.addDep('logger', logger);
    this.moduleHelpers.addDep('elasticsearch', elasticsearch);

    pubsubListen = sinon.spy();

    mockery.registerMock('./pubsub', _.constant({listen: pubsubListen}));
    mockery.registerMock('./reindex', () => {});
  });

  beforeEach(function() {
    total = 50;
    offset = 10;
    limit = 30;
    hits = [1, 2, 3];
    query = {
      offset,
      limit,
      domainId: '456',
      search: 'office'
    };

    this.getModule = () => require(this.moduleHelpers.backendPath + '/lib/search/index')(this.moduleHelpers.dependencies);
  });

  describe('The search function', function() {
    it('should resolve with elasticsearch dependency result', function(done) {
      const result = {hits: {total, hits}};
      const searchDocuments = sinon.spy((query, callback) => callback(null, result));

      this.moduleHelpers.addDep('elasticsearch', { searchDocuments });

      this.getModule().search(query).then(searchResult => {
        expect(searchDocuments).to.have.been.calledWith({
          index: 'resources.idx',
          type: 'resources',
          from: offset,
          size: limit,
          body: {
            query: {
              bool: {
                filter: [{ term: { domain: '456' } }],
                must: {
                  multi_match: {
                    fields: ['name', 'description'],
                    operator: 'and',
                    query: 'office',
                    tie_breaker: 0.5,
                    type: 'cross_fields'
                  }
                },
                must_not: { match: { deleted: true } }
              }
            },
            sort: { 'name.sort': { order: 'desc' } }
          }
        });

        expect(searchResult).to.deep.equals({ total_count: total, list: hits });

        done();
      }).catch(done);
    });

    it('should reject when elasticsearch dependency rejects', function(done) {
      const error = new Error('I failed');
      const searchDocuments = sinon.spy((query, callback) => callback(error));

      this.moduleHelpers.addDep('elasticsearch', { searchDocuments });

      this.getModule().search(query)
        .then(done)
        .catch(err => {
          expect(err).to.equal(error);
          done();
        });
    });
  });

  describe('The listen function', function() {
    it('should register listeners', function() {
      const register = sinon.spy();
      const reindexRegister = sinon.spy();

      mockery.registerMock('./reindex', () => ({ register: reindexRegister }));
      mockery.registerMock('./searchHandler', _.constant({register: register}));

      const module = require('../../../../backend/lib/search')(this.moduleHelpers.dependencies);

      module.listen();

      expect(register).to.have.been.calledOnce;
      expect(reindexRegister).to.have.been.calledOnce;
    });
  });
});
