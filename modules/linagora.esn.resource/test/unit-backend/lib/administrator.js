const {expect} = require('chai');
const sinon = require('sinon');

describe('The administrator lib', function() {
  let memberResolver;

  beforeEach(function() {
    memberResolver = {resolve: sinon.stub()};
    this.moduleHelpers.addDep('collaboration', {
      memberResolver
    });
    this.getModule = () => require(this.moduleHelpers.backendPath + '/lib/administrator')(this.moduleHelpers.dependencies);
  });

  describe('The resolve function', function() {
    it('should reject when resource is undefined', function(done) {
      this.getModule().resolve()
        .then(() => done(new Error('Should not occur')))
        .catch(err => {
          expect(err.message).to.match(/resource is required/);
          expect(memberResolver.resolve).to.not.have.been.called;
          done();
        });
    });

    it('should resolve with the supported administrators', function(done) {
      const user1 = { objectType: 'user', id: 1 };
      const user2 = { objectType: 'user', id: 2 };
      const user3 = { objectType: 'unsupported objectType', id: 3 };
      const resolved1 = {_id: user1.id};
      const resolved2 = {_id: user2.id};

      memberResolver.resolve.withArgs(sinon.match(user1)).returns(Promise.resolve(resolved1));
      memberResolver.resolve.withArgs(sinon.match(user2)).returns(Promise.resolve(resolved2));

      this.getModule().resolve({administrators: [user1, user2, user3]})
        .then(users => {
          expect(users).to.deep.include(resolved1);
          expect(users).to.deep.include(resolved2);
          expect(memberResolver.resolve).to.have.been.calledTwice;
          expect(memberResolver.resolve).to.have.been.calledWith(sinon.match(user1));
          expect(memberResolver.resolve).to.have.been.calledWith(sinon.match(user2));
          expect(memberResolver.resolve).to.not.have.been.calledWith(sinon.match(user3));
          done();
        })
        .catch(done);
    });
  });

  describe('The validateTuple function', function() {
    it('should reject when tuple is undefined', function(done) {
      this.getModule().validateTuple()
        .then(() => {
          done(new Error('Should not occur'));
        })
        .catch(err => {
          expect(memberResolver.resolve).to.not.have.been.called;
          expect(err.message).to.match(/Tuple must be defined with id and objectType/);
          done();
        });
    });

    it('should reject when tuple.id is undefined', function(done) {
      this.getModule().validateTuple({objectType: 'user'})
        .then(() => {
          done(new Error('Should not occur'));
        })
        .catch(err => {
          expect(memberResolver.resolve).to.not.have.been.called;
          expect(err.message).to.match(/Tuple must be defined with id and objectType/);
          done();
        });
    });

    it('should reject when tuple.objectType is undefined', function(done) {
      this.getModule().validateTuple({id: '1'})
        .then(() => {
          done(new Error('Should not occur'));
        })
        .catch(err => {
          expect(memberResolver.resolve).to.not.have.been.called;
          expect(err.message).to.match(/Tuple must be defined with id and objectType/);
          done();
        });
    });

    it('should reject when tuple.objectType is not supported', function(done) {
      this.getModule().validateTuple({id: '1', objectType: 'This type is probably not supported at all'})
        .then(() => {
          done(new Error('Should not occur'));
        })
        .catch(err => {
          expect(memberResolver.resolve).to.not.have.been.called;
          expect(err.message).to.match(/is not a supported administrator type/);
          done();
        });
    });

    it('should reject when tupleResolver rejects', function(done) {
      const errorMsg = 'I failed to resolve';
      const error = new Error(errorMsg);
      const tuple = {id: '1', objectType: 'user'};

      memberResolver.resolve.returns(Promise.reject(error));

      this.getModule().validateTuple(tuple)
        .then(() => {
          done(new Error('Should not occur'));
        })
        .catch(err => {
          expect(memberResolver.resolve).to.have.been.calledWith(tuple);
          expect(err.message).to.equal(errorMsg);
          done();
        });
    });

    it('should reject when tupleResolver does not send back result', function(done) {
      const tuple = {id: '1', objectType: 'user'};

      memberResolver.resolve.returns(Promise.resolve());

      this.getModule().validateTuple(tuple)
        .then(() => {
          done(new Error('Should not occur'));
        })
        .catch(err => {
          expect(memberResolver.resolve).to.have.been.calledWith(tuple);
          expect(err.message).to.match(/has not been found/);
          done();
        });
    });

    it('should resolve with tupleResolver result', function(done) {
      const tuple = {id: '1', objectType: 'user'};
      const result = {foo: 'bar'};

      memberResolver.resolve.returns(Promise.resolve(result));

      this.getModule().validateTuple(tuple)
        .then(value => {
          expect(memberResolver.resolve).to.have.been.calledWith(tuple);
          expect(value).to.equal(result);
          done();
        })
        .catch(() => {
          done(new Error('Should not occur'));
        });
    });
  });
});
