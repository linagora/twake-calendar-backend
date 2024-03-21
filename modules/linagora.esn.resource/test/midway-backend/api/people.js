const request = require('supertest');
const { expect } = require('chai');
const { ObjectId } = require('bson');

describe('GET /api/people/search with "resource" objectType', function() {
  let domain, domain2, user1Domain2;
  const password = 'secret';

  beforeEach(function(done) {
    const self = this;

    self.helpers.api.applyDomainDeployment('linagora_IT', function(err, models) {
      if (err) return done(err);

      domain = models.domain;
      self.models = models;

      self.helpers.api.applyDomainDeployment('linagora_test_domain', (err, models2) => {
        expect(err).to.not.exist;

        domain2 = models2.domain;
        user1Domain2 = models2.users[1];

        done();
      });
    });
  });

  it('should search and return only resources inside request user domain', function(done) {
    const self = this;
    const resourceDomain1 = {
      name: 'domain1 office',
      description: 'A description',
      type: 'type',
      domain: domain._id,
      creator: new ObjectId()
    };
    const resourceDomain2 = {
      name: 'domain2 office',
      description: 'A description',
      type: 'type',
      domain: domain2._id,
      creator: new ObjectId()
    };
    const { lib } = self.helpers.modules.current.lib;

    Promise.all([lib.resource.create(resourceDomain1), lib.resource.create(resourceDomain2)])
      .then(resources => self.helpers.elasticsearch.checkDocumentsIndexed({
        index: 'resources.idx',
        type: 'resources',
        ids: resources.map(resource => resource._id)
      }, err => {
        if (err) return done(err);

        test();
      }))
      .catch(done);

    function test() {
      self.helpers.api.loginAsUser(self.app, user1Domain2.emails[0], password, (err, requestAsMember) => {
        if (err) return done(err);

        requestAsMember(request(self.app)
          .post('/api/people/search'))
          .send({ objectType: ['resource'], q: 'office' })
          .expect(200)
          .end((err, res) => {
            if (err) return done(err);

            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0].names[0].displayName).to.equal('domain2 office');

            done();
          });
      });
    }
  });
});
