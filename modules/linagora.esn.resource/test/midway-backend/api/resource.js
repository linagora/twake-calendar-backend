const request = require('supertest');
const { expect } = require('chai');
const { ObjectId } = require('bson');
const { RESOURCE } = require('../../../backend/lib/constants');
const sinon = require('sinon');

describe('The resource API', function() {
  let user, user2, resource, domain;
  let domain2, user1Domain2;
  let pubsubLocal, publishSpy;
  const password = 'secret';

  beforeEach(function(done) {
    const self = this;

    resource = {
      name: 'Office 34',
      description: 'At the left then at the right then at the left',
      type: 'calendar-resource'
    };

    self.helpers.api.applyDomainDeployment('linagora_IT', function(err, models) {
      if (err) return done(err);

      user = models.users[0];
      user2 = models.users[1];
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

  beforeEach(function() {
    pubsubLocal = pubsubLocal || this.helpers.requireBackend('core').pubsub.local;
  });

  describe('GET /', function() {
    let resources, offset, limit;

    beforeEach(function(done) {
      const date = new Date();
      let seconds = 0;
      const self = this;
      const names = ['foo', 'bar', 'baz', 'qux', 'quux', 'corge', 'grault', 'garply', 'waldo', 'fred', 'plugh', 'xyzzy', 'thud'];

      offset = 0;
      limit = 10;

      Promise.all(names.map(create)).then(result => {
        resources = result;
        done();
      }).catch(done);

      function create(name) {
        const creation = new Date(date);

        creation.setSeconds(seconds++);

        const resource = {
          name,
          description: `The resource with name ${name}`,
          type: 'calendar-resource',
          domain: domain._id,
          icon: 'niceIcon',
          creator: new ObjectId(),
          timestamps: {
            creation
          }
        };

        return self.helpers.modules.current.lib.lib.resource.create(resource);
      }
    });

    it('should 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(this.app, 'get', '/api/resources', done);
    });

    it('should return the number of requested resources defined with ?limit', function(done) {
      const self = this;

      limit = 5;
      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(self.app).get(`/api/resources?offset=${offset}&limit=${limit}`));

        req.expect(200);
        req.end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.be.an('array').and.to.have.lengthOf(limit);
          done();
        });
      });
    });

    it('should return resources based on defined offset', function(done) {
      const self = this;

      limit = 5;
      offset = 10;
      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(self.app).get(`/api/resources?offset=${offset}&limit=${limit}`));

        req.expect(200);
        req.end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.be.an('array').and.to.have.lengthOf(resources.length - offset);
          done();
        });
      });
    });

    it('should return empty array when pagination is over number of resources', function(done) {
      offset = resources.length;
      const self = this;

      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(self.app).get(`/api/resources?offset=${offset}&limit=${limit}`));

        req.expect(200);
        req.end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body).to.be.an('array').and.to.be.empty;
          done();
        });
      });
    });

    it('should return the resources in the right order', function(done) {
      const self = this;

      limit = 5;
      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(self.app).get(`/api/resources?offset=${offset}&limit=${limit}`));

        req.expect(200);
        req.end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(new Date(res.body[0].timestamps.creation)).to.afterTime(new Date(res.body[1].timestamps.creation));
          expect(new Date(res.body[1].timestamps.creation)).to.afterTime(new Date(res.body[2].timestamps.creation));
          expect(new Date(res.body[2].timestamps.creation)).to.afterTime(new Date(res.body[3].timestamps.creation));
          expect(new Date(res.body[3].timestamps.creation)).to.afterTime(new Date(res.body[4].timestamps.creation));
          done();
        });
      });
    });

    it('should return only the resource with the defined type', function(done) {
      const self = this;
      const type = 'Atypeonlymewillhave';
      const resource = {
        name: 'Foobar',
        description: 'A description',
        type: type,
        domain: domain._id,
        creator: new ObjectId()
      };

      self.helpers.modules.current.lib.lib.resource.create(resource).then(test);

      function test(created) {
        self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(self.app).get(`/api/resources?offset=${offset}&limit=${limit}&type=${type}`));

          req.expect(200);
          req.end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body).to.be.an('array').and.to.have.lengthOf(1);
            expect(res.body[0]._id).to.equal(String(created._id));
            done();
          });
        });
      }
    });

    it('should return only resources inside request user domain', function(done) {
      const self = this;
      const resourceDomain1 = {
        name: 'resource belongs to domain 1',
        description: 'A description',
        type: 'type',
        domain: domain._id,
        creator: new ObjectId()
      };
      const resourceDomain2 = {
        name: 'resource belongs to domain 2',
        description: 'A description',
        type: 'type',
        domain: domain2._id,
        creator: new ObjectId()
      };

      self.helpers.modules.current.lib.lib.resource.create(resourceDomain1)
        .then(() => {
          self.helpers.modules.current.lib.lib.resource.create(resourceDomain2);
        })
        .then(test)
        .catch(done);

      function test() {
        self.helpers.api.loginAsUser(self.app, user1Domain2.emails[0], password, (err, requestAsMember) => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(self.app).get(`/api/resources?offset=${offset}&limit=${limit}`));

          req.expect(200);
          req.end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0].name).to.equal(resourceDomain2.name);
            expect(res.body[0].domain._id.toString()).to.equal(resourceDomain2.domain.toString());
            done();
          });
        });
      }
    });

    describe('with search query', function() {
      it('should return the matching resource of the query', function(done) {
        const self = this;
        const { lib } = self.helpers.modules.current.lib;
        const resource = {
          name: 'Foobar',
          description: 'A description',
          type: 'type',
          domain: domain._id,
          creator: new ObjectId()
        };

        lib.resource.create(resource).then(resource => self.helpers.elasticsearch.checkDocumentsIndexed({
          index: 'resources.idx',
          type: 'resources',
          ids: [resource._id]
        }, err => {
          if (err) return done(err);

          self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
            if (err) return done(err);

            requestAsMember(request(self.app).get(`/api/resources?query=${resource.name}`))
              .expect(200)
              .end((err, res) => {
                if (err) return done(err);

                expect(res.body).to.be.an('array').and.to.have.lengthOf(1);
                expect(res.body[0]._id).to.equal(String(resource._id));
                done();
              });
          });
        }));
      });
    });
  });

  describe('GET /:id', function() {
    it('should 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(this.app, 'get', '/api/resources/123', done);
    });

    it('should 404 when resource does not exists', function(done) {
      const id = new ObjectId();
      const self = this;

      this.helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(self.app).get(`/api/resources/${id}`));

        req.expect(404, done);
      });
    });

    it('should return 403 if resource is not belong to request user domain', function(done) {
      const self = this;
      const resource = {
        name: 'Foobar',
        description: 'A description',
        type: 'type',
        domain: domain._id,
        creator: new ObjectId()
      };

      self.helpers.modules.current.lib.lib.resource.create(resource).then(test).catch(done);

      function test(createdResource) {
        self.helpers.api.loginAsUser(self.app, user1Domain2.emails[0], password, (err, requestAsMember) => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(self.app).get(`/api/resources/${createdResource._id}`));

          req.expect(403);
          req.end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.error.details).to.equal(`You do not have required permission on resource ${createdResource._id}`);
            done();
          });
        });
      }
    });

    it('should 200 with the resource', function(done) {
      const self = this;

      resource.creator = user._id;
      resource.domain = domain._id;
      resource.icon = 'icon';

      this.helpers.modules.current.lib.lib.resource.create(resource)
      .then(test)
      .catch(done);

      function test(resourceToGet) {
        self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(self.app).get(`/api/resources/${resourceToGet._id}`));

          req.expect(200);
          req.end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body).to.shallowDeepEqual({
              _id: resourceToGet.id,
              creator: user.id,
              name: resource.name,
              domain: {_id: domain._id.toString()},
              description: resource.description,
              type: resource.type,
              icon: 'icon'
            });

            done();
          });
        });
      }
    });
  });

  describe('DEL /:id', function() {
    it('should 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(this.app, 'delete', '/api/resources/123', done);
    });

    it('should 404 when resource does not exists', function(done) {
      const self = this;
      const id = new ObjectId();

      this.helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(self.app).delete(`/api/resources/${id}`));

        req.expect(404, done);
      });
    });

    it('should 403 when user is not the domain manager', function(done) {
      const self = this;

      resource.creator = new ObjectId();
      resource.domain = domain._id;

      this.helpers.modules.current.lib.lib.resource.create(resource)
        .then(test)
        .catch(done);

      function test(created) {
        self.helpers.api.loginAsUser(self.app, user2.emails[0], password, (err, requestAsMember) => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(self.app).delete(`/api/resources/${created._id}`));

          req.expect(403, done);
        });
      }
    });

    it('should 200 and publish it locally on `resource:updated`', function(done) {
      const self = this;

      resource.creator = user._id;
      resource.domain = domain._id;
      publishSpy = sinon.spy();
      pubsubLocal.topic(RESOURCE.UPDATED).publish = publishSpy;

      this.helpers.modules.current.lib.lib.resource.create(resource)
        .then(test)
        .catch(done);

      function test(created) {
        var expected = {
          _id: created._id,
          name: created.name,
          description: created.description,
          type: created.type,
          deleted: true
        };

        self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
          if (err) return done(err);

          const req = requestAsMember(request(self.app).delete(`/api/resources/${created._id}`));

          req.expect(200);
          req.end(err => {
            if (err) return done(err);

            return self.helpers.modules.current.lib.lib.resource.get(created._id).then(result => {
              expect(result).to.shallowDeepEqual(expected);
              expect(publishSpy).to.have.been.calledWith(sinon.match(expected));

              done();
            }).catch(done);
          });
        });
      }
    });
  });

  describe('POST /', function() {
    it('should 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(this.app, 'post', '/api/resources', done);
    });

    it('should create the resource, publish it locally on topic \'resource:created\' and send it back', function(done) {
      const self = this;

      publishSpy = sinon.spy();
      pubsubLocal.topic(RESOURCE.CREATED).publish = publishSpy;

      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(self.app)
          .post('/api/resources'))
          .send(resource)
          .expect(201)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(publishSpy).to.have.been.calledWith(sinon.match({
              _id: sinon.match.any,
              creator: sinon.match.any,
              domain: sinon.match.any,
              name: resource.name,
              description: resource.description,
              type: resource.type,
              timestamps: {creation: sinon.match.any}
            }));

            expect(res.body).to.shallowDeepEqual({
              name: resource.name,
              description: resource.description,
              type: resource.type
            });

            done();
          });
      });
    });

    it('should 400 when administrator is not supported type', function(done) {
      const self = this;

      resource.administrators = [{id: 1, objectType: 'I am not a supported type'}];
      publishSpy = sinon.spy();
      pubsubLocal.topic(RESOURCE.CREATED).publish = publishSpy;

      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(self.app)
          .post('/api/resources'))
          .send(resource)
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(publishSpy).to.not.have.been.called;
            expect(res.body).to.shallowDeepEqual({
              error: {
                status: 400,
                message: 'Bad request',
                details: 'One or more administrators are invalid'
              }
            });
            done();
          });
        });
    });

    it('should 400 when body.administrator is not an array', function(done) {
      const self = this;

      resource.administrators = 'I am not an array';
      publishSpy = sinon.spy();
      pubsubLocal.topic(RESOURCE.CREATED).publish = publishSpy;

      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(self.app)
          .post('/api/resources'))
          .send(resource)
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(publishSpy).to.not.have.been.called;
            expect(res.body).to.shallowDeepEqual({
              error: {
                status: 400,
                message: 'Bad request',
                details: 'administrators must be an array'
              }
            });
            done();
          });
        });
    });

    it.skip('should 400 when an administrator is invalid', function(done) {
      const self = this;

      resource.administrators = [{id: String(user._id), objectType: 'user'}, {id: 1, objectType: 'user'}];
      publishSpy = sinon.spy();
      pubsubLocal.topic(RESOURCE.CREATED).publish = publishSpy;

      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(self.app)
          .post('/api/resources'))
          .send(resource)
          .expect(400)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(publishSpy).to.not.have.been.called;
            expect(res.body).to.shallowDeepEqual({
              error: {
                status: 400,
                message: 'Bad request',
                details: 'One or more administrators are invalid'
              }
            });
            done();
          });
        });
    });

    it('should create with the given administrators', function(done) {
      const self = this;

      resource.administrators = [{id: String(user._id), objectType: 'user'}];
      publishSpy = sinon.spy();
      pubsubLocal.topic(RESOURCE.CREATED).publish = publishSpy;

      self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(self.app)
          .post('/api/resources'))
          .send(resource)
          .expect(201)
          .end(err => {
            if (err) {
              return done(err);
            }

            expect(publishSpy).to.have.been.called;
            done();
          });
        });
    });

    it('should 403 when user is not the domain manager', function(done) {
      const self = this;

      resource.creator = new ObjectId();
      resource.domain = domain._id;

      self.helpers.api.loginAsUser(self.app, user2.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        requestAsMember(request(self.app)
        .post('/api/resources'))
        .send(resource)
        .expect(403)
        .end(done);
      });
    });
  });

  describe('PUT /:id', function() {
    it('should 401 if not logged in', function(done) {
      this.helpers.api.requireLogin(this.app, 'put', '/api/resources/123', done);
    });

    it('should 404 when resource does not exists', function(done) {
      const id = new ObjectId();
      const self = this;

      this.helpers.api.loginAsUser(this.app, user.emails[0], password, (err, requestAsMember) => {
        if (err) {
          return done(err);
        }

        const req = requestAsMember(request(self.app).put(`/api/resources/${id}`));

        req.expect(404, done);
      });
    });

    it('should 403 when a user not domain manager try to update resource`', function(done) {
      const self = this;
      const resourceUpdated = {
        name: 'resource updated',
        description: 'description updated',
        type: resource.type
      };

      resource.creator = user2._id;
      resource.domain = domain._id;
      publishSpy = sinon.spy();
      pubsubLocal.topic(RESOURCE.UPDATED).publish = publishSpy;

      this.helpers.modules.current.lib.lib.resource.create(resource)
        .then(test)
        .catch(done);

      function test(created) {
        self.helpers.api.loginAsUser(self.app, user2.emails[0], password, (err, requestAsMember) => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(self.app).put(`/api/resources/${created._id}`));

          req.send(resourceUpdated);
          req.expect(403);
          req.end(err => {
            if (err) {
              return done(err);
            }

            return self.helpers.modules.current.lib.lib.resource.get(created._id).then(result => {
              expect(result).to.shallowDeepEqual({
                name: created.name,
                description: created.description,
                type: resource.type
              });

              expect(publishSpy).to.not.have.been.called;

              done();
            });
          });
        });
      }
    });

    it('should 200 and publish it locally on `resource:updated`', function(done) {
      const self = this;
      const resourceUpdated = {
        name: 'resource updated',
        description: 'description updated',
        type: resource.type,
        timestamps: {}
      };

      resource.creator = user._id;
      resource.domain = domain._id;
      publishSpy = sinon.spy();
      pubsubLocal.topic(RESOURCE.UPDATED).publish = publishSpy;

      this.helpers.modules.current.lib.lib.resource.create(resource)
        .then(test)
        .catch(done);

      function test(created) {
        self.helpers.api.loginAsUser(self.app, user.emails[0], password, (err, requestAsMember) => {
          if (err) {
            return done(err);
          }

          const req = requestAsMember(request(self.app).put(`/api/resources/${created._id}`));

          req.send(resourceUpdated);
          req.expect(200);
          req.end(err => {
            if (err) {
              return done(err);
            }

            return self.helpers.modules.current.lib.lib.resource.get(created._id).then(result => {
              expect(result).to.shallowDeepEqual({
                name: resourceUpdated.name,
                description: resourceUpdated.description,
                type: resource.type
              });
              expect(publishSpy).to.have.been.calledWith(sinon.match({
                _id: created._id,
                creator: sinon.match.any,
                domain: sinon.match.any,
                name: resourceUpdated.name,
                description: resourceUpdated.description,
                type: created.type,
                timestamps: {
                  creation: sinon.match.any,
                  updatedAt: sinon.match.any
                }
              }));

              done();
            });
          });
        });
      }
    });
  });
});
