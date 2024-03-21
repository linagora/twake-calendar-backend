const sinon = require('sinon');
const mockery = require('mockery');
const { expect } = require('chai');

describe('The lib/importer/workers/import-item module', function() {
  let getModule;
  let importItemModuleMock, userMock;

  beforeEach(function() {
    userMock = {};

    this.moduleHelpers.addDep('user', userMock);

    importItemModuleMock = {
      getById: sinon.stub(),
      updateById: sinon.stub().returns(Promise.resolve())
    };
    mockery.registerMock('../../import-item', () => importItemModuleMock);

    getModule = () => require(`${this.moduleHelpers.backendPath}/lib/importer/workers/import-item`)(this.moduleHelpers.dependencies);
  });

  describe('The handle method', function() {
    let job, getHandleMethod;

    beforeEach(function() {
      job = {
        data: {
          itemId: 'itemId'
        }
      };

      getHandleMethod = () => getModule().handler.handle;
    });

    it('should reject if it cannot get import item', function(done) {
      importItemModuleMock.getById.returns(Promise.reject(new Error('an_error')));

      getHandleMethod()(job).catch(err => {
        expect(err.message).to.equal('an_error');
        done();
      });
    });

    it('should get import item with request populated', function() {
      importItemModuleMock.getById.returns(Promise.resolve());

      getHandleMethod()(job);

      expect(importItemModuleMock.getById).to.have.been.calledWith(job.data.itemId, { populations: { request: true } });
    });

    it('should reject if no file handler found', function(done) {
      importItemModuleMock.getById.returns(Promise.resolve({
        rawData: 'rawData',
        request: {
          creator: 'creator',
          target: 'target',
          contentType: 'text/vcard'
        }
      }));

      getHandleMethod()(job).catch(err => {
        expect(err.message).to.contain('No file handler for file type');
        done();
      });
    });

    it('should import item using file handler', function(done) {
      const handler = {
        readLines() {},
        importItem: sinon.stub(),
        targetValidator() {}
      };
      const importItem = {
        rawData: 'rawData',
        request: {
          creator: 'creator',
          target: 'target',
          contentType: 'text/vcard'
        }
      };
      const userTest = {
        _id: '123',
        preferredEmail: 'test@test.com'
      };

      require(this.moduleHelpers.backendPath + '/lib/importer/handler').register(importItem.request.contentType, handler);
      importItemModuleMock.getById.returns(Promise.resolve(importItem));
      handler.importItem.returns(Promise.resolve());
      userMock.get = sinon.spy((id, callback) => callback(null, userTest));
      userMock.getNewToken = sinon.spy((user, ttl, callback) => callback(null, { token: 'token', user: userTest }));

      getHandleMethod()(job).then(() => {
        expect(handler.importItem).to.have.been.calledWith(importItem.rawData, { target: importItem.request.target, token: 'token', user: userTest });
        done();
      })
      .catch(err => done(err || 'should resolve'));
    });
  });

  describe('The getTitle method', function() {
    it('should return a correct title from job data', function() {
      const itemId = '123';

      expect(getModule().handler.getTitle({ itemId })).to.equal(`Import DAV item ${itemId}`);
    });
  });
});
