const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');

describe('The Webserver resource controller', function() {
  let query, limit, offset, sortKey, sortOrder, domainId, req, header, deleted;

  beforeEach(function() {
    query = 'Search me';
    limit = 10;
    offset = 20;
    sortKey = 'name';
    sortOrder = 'desc';
    domainId = 1;
    deleted = false;
    req = { query: { query, limit, offset, sortKey, sortOrder, domainId, deleted } };
    header = sinon.spy();

    this.getModule = () => require(this.moduleHelpers.backendPath + '/webserver/api/resource/controller')(this.moduleHelpers.dependencies);
  });

  describe('The list function', function() {
    describe('When ?query parameter is defined (search)', function() {
      it('should search with valid parameters', function(done) {
        const search = sinon.stub().returns(Promise.resolve({ list: [] }));

        mockery.registerMock('../../../lib/resource', () => {});
        mockery.registerMock('../../../lib/search', () => ({ search }));

        this.getModule().list(req, {
          header,
          status: code => {
            expect(search).to.have.been.calledWith({
              search: query,
              limit,
              offset,
              sortKey,
              sortOrder,
              domainId,
              deleted
            });
            expect(code).to.equal(200);

            return { json: () => done() };
          }
        });
      });

      it('should HTTP 500 when search failed', function(done) {
        const search = sinon.stub().returns(Promise.reject(new Error('I failed')));

        mockery.registerMock('../../../lib/resource', () => {});
        mockery.registerMock('../../../lib/search', () => ({ search }));

        this.getModule().list(req, {
          header,
          status: code => {
            expect(search).to.have.been.calledOnce;
            expect(code).to.equal(500);

            return { json: () => done() };
          }
        });
      });

      it('should call resourceLib.get for each found resource', function(done) {
        const resource = {_id: 1};
        const resources = [{_id: 1}, {_id: 2}, {_id: 3}];
        const search = sinon.stub().returns(Promise.resolve({ list: resources }));
        const get = sinon.stub().returns(Promise.resolve(resource));

        mockery.registerMock('../../../lib/resource', () => ({ get }));
        mockery.registerMock('../../../lib/search', () => ({ search }));

        this.getModule().list(req, {
          header,
          status: code => {
            expect(search).to.have.been.calledOnce;
            expect(get.callCount).to.equal(resources.length);
            expect(get).to.have.been.calledWith(resources[0]._id);
            expect(get).to.have.been.calledWith(resources[1]._id);
            expect(get).to.have.been.calledWith(resources[2]._id);
            expect(code).to.equal(200);

            return { json: () => done() };
          }
        });
      });

      it('should HTTP 200 with the resources which have been resolved', function(done) {
        const resources = [{_id: 1}, {_id: 2}, {_id: 3}];
        const search = sinon.stub().returns(Promise.resolve({ list: resources }));
        const get = sinon.stub();

        get.onFirstCall().returns(Promise.resolve(resources[0]));
        get.onSecondCall().returns(Promise.reject(new Error()));
        get.onThirdCall().returns(Promise.resolve(resources[1]));

        mockery.registerMock('../../../lib/resource', () => ({ get }));
        mockery.registerMock('../../../lib/search', () => ({ search }));

        this.getModule().list(req, {
          header,
          status: code => {
            expect(search).to.have.been.calledOnce;
            expect(get.callCount).to.equal(resources.length);
            expect(get).to.have.been.calledWith(resources[0]._id);
            expect(get).to.have.been.calledWith(resources[1]._id);
            expect(get).to.have.been.calledWith(resources[2]._id);
            expect(code).to.equal(200);

            return { json: payload => {
              expect(payload).to.have.length(2);
              expect(payload).to.deep.include.members([resources[0], resources[1]]);
              done();
            }};
          }
        });
      });

      it('should HTTP 200 with empty array if no resource have been found', function(done) {
        const search = sinon.stub().returns(Promise.resolve({ list: [] }));
        const get = sinon.spy();

        mockery.registerMock('../../../lib/resource', () => ({ get }));
        mockery.registerMock('../../../lib/search', () => ({ search }));

        this.getModule().list(req, {
          header,
          status: code => {
            expect(search).to.have.been.calledOnce;
            expect(get).to.not.have.been.called;
            expect(code).to.equal(200);

            return { json: payload => {
              expect(payload).to.be.instanceof(Array).and.to.be.empty;
              done();
            }};
          }
        });
      });

      it('should HTTP 200 with the right X-ESN-Items-Count header value', function(done) {
        const total_count = 129;
        const resources = [{_id: 1}, {_id: 2}, {_id: 3}];
        const search = sinon.stub().returns(Promise.resolve({ list: resources, total_count }));
        const get = sinon.stub().returns(Promise.resolve());

        mockery.registerMock('../../../lib/resource', () => ({ get }));
        mockery.registerMock('../../../lib/search', () => ({ search }));

        this.getModule().list(req, {
          header,
          status: code => {
            expect(code).to.equal(200);
            expect(header).to.have.been.calledWith('X-ESN-Items-Count', total_count);

            return { json: () => done() };
          }
        });
      });

      it('should HTTP 200 with empty array if no resource have been resolved', function(done) {
        const resources = [{_id: 1}, {_id: 2}, {_id: 3}];
        const search = sinon.stub().returns(Promise.resolve({ list: resources }));
        const get = sinon.stub().returns(Promise.reject(new Error()));

        mockery.registerMock('../../../lib/resource', () => ({ get }));
        mockery.registerMock('../../../lib/search', () => ({ search }));

        this.getModule().list(req, {
          header,
          status: code => {
            expect(search).to.have.been.calledOnce;
            expect(get.callCount).to.equal(resources.length);
            expect(get).to.have.been.calledWith(resources[0]._id);
            expect(get).to.have.been.calledWith(resources[1]._id);
            expect(get).to.have.been.calledWith(resources[2]._id);
            expect(code).to.equal(200);

            return { json: payload => {
              expect(payload).to.be.instanceof(Array).and.to.be.empty;
              done();
            }};
          }
        });
      });
    });
  });
});
