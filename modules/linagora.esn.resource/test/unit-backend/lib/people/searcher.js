const { expect } = require('chai');
const mockery = require('mockery');
const sinon = require('sinon');

describe('The people searcher module', () => {
  let getModule, searchLib, resourceLib;

  beforeEach(function() {
    searchLib = {
      search: sinon.stub()
    };
    resourceLib = {
      get: sinon.stub()
    };

    mockery.registerMock('../search', () => searchLib);
    mockery.registerMock('../resource', () => resourceLib);
    getModule = () => require(`${this.moduleHelpers.backendPath}/lib/people/searcher`)(this.moduleHelpers.dependencies);
  });

  it('should call search with correct query', function(done) {
    searchLib.search.returns(Promise.resolve({ list: [] }));

    getModule()({
      term: 'searchme',
      context: {
        user: { _id: 'user' },
        domain: { _id: 'domain' }
      },
      pagination: { limit: 10 }
    }).then(() => {
      expect(searchLib.search).to.have.been.calledWith({
        search: 'searchme',
        limit: 10,
        userId: 'user',
        domainId: 'domain'
      });
      done();
    }).catch(done);
  });

  it('should settle all getting resource promises', function(done) {
    searchLib.search.returns(Promise.resolve({
      list: [{
        _id: 'resource1'
      }, {
        _id: 'resource2'
      }, {
        _id: 'resource3'
      }]
    }));
    resourceLib.get.withArgs('resource1').returns(Promise.reject());
    resourceLib.get.withArgs('resource2').returns(Promise.resolve({ _id: 'resource2' }));
    resourceLib.get.withArgs('resource3').returns(Promise.resolve({ _id: 'resource3' }));

    getModule()({
      term: 'searchme',
      context: {
        user: { _id: 'user' },
        domain: { _id: 'domain' }
      },
      pagination: { limit: 10 }
    }).then(result => {
      expect(result).to.have.lengthOf(2);
      expect(resourceLib.get).to.have.been.calledThrice;
      done();
    }).catch(done);
  });
});
