'use strict';

const request = require('supertest');
const expect = require('chai').expect;
const MODULE_NAME = 'linagora.esn.dav.import';

describe.skip('The /import API', function() {
  let user, app;
  const password = 'secret';

  beforeEach(function(done) {
    const self = this;

    this.helpers.modules.initMidway(MODULE_NAME, function(err) {
      if (err) {
        return done(err);
      }
      const application = require(self.testEnv.backendPath + '/webserver/application')(self.helpers.modules.current.deps);
      const api = require(self.testEnv.backendPath + '/webserver/api')(self.helpers.modules.current.deps, self.helpers.modules.current.lib.lib);

      application.use(require('body-parser').json());
      application.use('/api', api);

      app = self.helpers.modules.getWebServer(application);

      self.helpers.api.applyDomainDeployment('linagora_IT', function(err, models) {
        if (err) {
          return done(err);
        }
        user = models.users[0];

        done();
      });
    });
  });

  afterEach(function(done) {
    this.helpers.mongo.dropDatabase(err => {
      if (err) return done(err);
      this.testEnv.core.db.mongo.mongoose.connection.close(done);
    });
  });

  describe('POST /import', function() {
    it('should respond 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(app, 'post', '/api/import', done);
    });

    it('should response 400 when fileId is missing', function(done) {
      const self = this;

      self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(app).post('/api/import').send({}))
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.deep.equal({
              error: {
                code: 400,
                message: 'Bad Request',
                details: 'fileId is required'
              }
            });

            done();
          });
      });
    });

    it('should response 400 when target is missing', function(done) {
      const self = this;

      self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(app).post('/api/import').send({ fileId: '12345' }))
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.deep.equal({
              error: {
                code: 400,
                message: 'Bad Request',
                details: 'target is required'
              }
            });

            done();
          });
      });
    });

    it('should response 400 when file is not found', function(done) {
      const self = this;

      self.helpers.api.loginAsUser(app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(app).post('/api/import').send({ fileId: '5b2886f91964382415ef3e14', target: 'addressbooks/bookId/bookname.json' }))
          .expect(400)
          .end((err, res) => {
            if (err) return done(err);
            expect(res.body).to.deep.equal({
              error: {
                code: 400,
                message: 'Bad Request',
                details: 'The input file does not exist'
              }
            });

            done();
          });
      });
    });
  });
});
