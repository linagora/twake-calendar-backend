const { expect } = require('chai');
const sinon = require('sinon');
const mockery = require('mockery');
const fs = require('fs');

describe('The caldav-client module', function() {
  let authMock, davServerMock, request, davEndpoint, userId, calendarId, eventId, token, jcal;
  let getModule;

  beforeEach(function() {
    davEndpoint = 'http://davendpoint:8003';
    userId = 'user1';
    calendarId = 'calendar2';
    eventId = 'event3';
    token = 'aToken';
    jcal = {};
  });

  beforeEach(function() {
    this.calendarModulePath = this.moduleHelpers.modulePath;
    authMock = {
      token: {
        getNewToken: sinon.spy(function(opts, callback) {
          return callback(null, { token: token });
        })
      }
    };

    davServerMock = {
      utils: {
        getDavEndpoint: sinon.spy(function(callback) {
          return callback(davEndpoint);
        })
      }
    };

    this.moduleHelpers.addDep('auth', authMock);
    this.moduleHelpers.addDep('davserver', davServerMock);

    getModule = () => require(`${this.calendarModulePath}/backend/lib/caldav-client`)(this.moduleHelpers.dependencies);
  });

  describe('the getEvent function', function() {
    beforeEach(function() {
      request = {
        method: 'GET',
        url: [davEndpoint, 'calendars', userId, calendarId, eventId + '.ics'].join('/'),
        headers: { ESNToken: token }
      };
    });

    it('should fail if token retrieval fails', function(done) {
      authMock.token.getNewToken = sinon.spy(function(opts, callback) {
        return callback(new Error());
      });

      getModule()
        .getEvent(userId, 'calendarId', 'eventUid')
        .then(
          function() {
            done('The promise should not have successed');
          },
          function(err) {
            expect(err).to.exist;
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          });
    });

    it('should call request with the built parameters and reject if it fails', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(new Error());
      };

      mockery.registerMock('request', requestMock);

      getModule()
        .getEvent(userId, calendarId, eventId)
        .then(
          function() {
            done('The promise should not have successed');
          },
          function(err) {
            expect(err).to.exist;
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          });
    });

    it('should return a long eventPath if all arguments are passed', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, { body: 'body', headers: { etag: 'etag' }}, 'body');
      };

      mockery.registerMock('request', requestMock);

      getModule()
        .getEvent(userId, calendarId, eventId)
        .then(
          function(event) {
            expect(event).to.deep.equal({ ical: 'body', etag: 'etag' });
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          },
          done);
    });

    it('should return only userId if calendarURI is not passed', function(done) {
      const requestMock = function(opts, callback) {
        request.url = [davEndpoint, 'calendars', userId].join('/');

        expect(opts).to.deep.equal(request);

        callback(null, { body: 'body', headers: { etag: 'etag' }}, 'body');
      };

      mockery.registerMock('request', requestMock);

      getModule()
        .getEvent(userId, null, eventId)
        .then(
          function(event) {
            expect(event).to.deep.equal({ical: 'body', etag: 'etag'});
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          },
          done);
    });

    it('should return only userId && calendarURI if eventUID is not passed', function(done) {
      const requestMock = function(opts, callback) {
        request.url = [davEndpoint, 'calendars', userId, `${calendarId}.json`].join('/');

        expect(opts).to.deep.equal(request);

        callback(null, {body: 'body', headers: {etag: 'etag'}}, 'body');
      };

      mockery.registerMock('request', requestMock);

      getModule()
        .getEvent(userId, calendarId)
        .then(
          function(event) {
            expect(event).to.deep.equal({ical: 'body', etag: 'etag'});
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          },
          done);
    });

  });

  describe('the iTipRequest function', function() {
    beforeEach(function() {
        request = {
          method: 'ITIP',
          url: [davEndpoint, 'calendars', userId].join('/'),
          headers: {
            ESNToken: token
          },
          json: true,
          body: jcal
        };
      }
    );

    it('should fail if token retrieval fails', function(done) {
      authMock.token.getNewToken = sinon.spy(function(opts, callback) {
        return callback(new Error());
      });

      getModule()
        .iTipRequest(userId, calendarId, eventId, jcal)
        .then(
          function() {
            done('The promise should not have successed');
          },
          function(err) {
            expect(err).to.exist;
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          });
    });

    it('should call request with the built parameters and reject if it fails', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(new Error());
      };

      mockery.registerMock('request', requestMock);

      getModule()
        .iTipRequest(userId, jcal)
        .then(
          function() {
            done('The promise should not have successed');
          },
          function(err) {
            expect(err).to.exist;
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          });
    });

    it('should reject if status code is unexpected', function(done) {
      const requestMock = function(opts, callback) {
        callback(null, { statusCode: 502 }, '');
      };

      mockery.registerMock('request', requestMock);

      getModule().iTipRequest(userId, jcal)
        .then(() => done(new Error('should not occur')))
        .catch(err => {
          expect(err).to.exist;
          expect(err.message).to.match(/Invalid response status from DAV server 502/);
          expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
          expect(davServerMock.utils.getDavEndpoint).to.have.been.called;
          done();
        });
    });

    it('should call request with the built parameters and resolve with its results if it succeeds', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, { body: 'body' }, 'body');
      };

      mockery.registerMock('request', requestMock);

      getModule()
        .iTipRequest(userId, jcal)
        .then(
          function(event) {
            expect(event).to.deep.equal('body');
            expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
            expect(davServerMock.utils.getDavEndpoint).to.have.been.called;

            done();
          },
          done);
    });
  });

  describe('The getCalendarList function', function() {
    beforeEach(function() {
      request = {
        method: 'GET',
        url: [davEndpoint, 'calendars', userId].join('/'),
        headers: {
          Accept: 'application/json',
          ESNToken: token
        },
        json: true
      };
    });

    it('should fail if token retrieval fails', function(done) {
      authMock.token.getNewToken = sinon.spy(function(opts, callback) {
        return callback(new Error());
      });

      getModule().getCalendarList(userId).then(() => done('Test should have failed'), () => done());
    });

    it('should call request with the built parameters and reject if it fails', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(new Error());
      };

      mockery.registerMock('request', requestMock);

      getModule().getCalendarList(userId).then(() => done('Test should have failed'), () => done());
    });

    it('should call request with the built parameters and reject if response is an error', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, {
          statusCode: 500
        });
      };

      mockery.registerMock('request', requestMock);

      getModule().getCalendarList(userId).then(() => done('Test should have failed'), () => done());
    });

    it('should call request with the built parameters and resolve with an empty list if response is not a calendar list', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, {
            statusCode: 200,
            body: {}
          },
          {});
      };

      mockery.registerMock('request', requestMock);

      getModule().getCalendarList(userId).then(list => {
        expect(list).to.deep.equal([]);

        done();
      });
    });

    it('should call request with the built parameters and resolve with a calendar list', function(done) {
      const requestMock = function(opts, callback) {
        expect(opts).to.deep.equal(request);

        callback(null, {
            statusCode: 200,
            body: {
              _links: {
                self: {
                  href: '/dav/calendars/584abaa9e2d7d7686cff340f.json'
                }
              },
              _embedded: {
                'dav:calendar': [
                  {
                    _links: {
                      self: {
                        href: '/dav/calendars/584abaa9e2d7d7686cff340f/events.json'
                      }
                    }
                  },
                  {
                    _links: {
                      self: {
                        href: '/dav/calendars/584abaa9e2d7d7686cff340f/df68daee-a30d-4191-80de-9c1d689062e1.json'
                      }
                    },
                    'dav:name': 'Personal',
                    'caldav:description': 'Description of Personal',
                    'apple:color': '#aa37bb'
                  }
                ]
              }
            }
          },
          'body');
      };

      mockery.registerMock('request', requestMock);

      getModule().getCalendarList(userId).then(list => {
        expect(list).to.deep.equal([
          {
            id: 'events',
            uri: '/dav/calendars/584abaa9e2d7d7686cff340f/events',
            name: 'Events',
            description: undefined,
            color: undefined
          },
          {
            id: 'df68daee-a30d-4191-80de-9c1d689062e1',
            uri: '/dav/calendars/584abaa9e2d7d7686cff340f/df68daee-a30d-4191-80de-9c1d689062e1',
            name: 'Personal',
            description: 'Description of Personal',
            color: '#aa37bb'
          }
        ]);

        done();
      });
    });

  });

  describe('the getEventInDefaultCalendar function', function() {

    it('should GET an event in the default calendar', function(done) {
      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'GET',
          url: [davEndpoint, 'calendars', userId, userId, eventId + '.ics'].join('/'),
          headers: {
            ESNToken: token
          }
        });

        done();
      });

      getModule().getEventInDefaultCalendar({ id: userId }, eventId);
    });

  });

  describe('the storeEvent function', function() {

    it('should PUT the event', function(done) {
      const event = [['vcalendar', [], []]];

      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'PUT',
          url: [davEndpoint, 'calendars', userId, calendarId, eventId + '.ics'].join('/'),
          json: true,
          headers: {
            ESNToken: token
          },
          body: event
        });

        done();
      });

      getModule().storeEvent({ id: userId }, calendarId, eventId, event);
    });

  });

  describe('the storeEventInDefaultCalendar function', function() {

    it('should PUT the event in the default calendar', function(done) {
      const event = ['vcalendar', [], []];

      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'PUT',
          url: [davEndpoint, 'calendars', userId, userId, eventId + '.ics'].join('/'),
          json: true,
          headers: {
            ESNToken: token
          },
          body: event
        });

        done();
      });

      getModule().storeEventInDefaultCalendar({ id: userId }, eventId, event);
    });

  });

  describe('the deleteEvent function', function() {

    it('should DELETE the event', function(done) {
      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'DELETE',
          url: [davEndpoint, 'calendars', userId, calendarId, eventId + '.ics'].join('/'),
          headers: {
            ESNToken: token
          }
        });

        done();
      });

      getModule().deleteEvent({ id: userId }, calendarId, eventId);
    });

  });

  describe('the deleteEventInDefaultCalendar function', function() {

    it('should DELETE the event in the default calendar', function(done) {
      mockery.registerMock('request', opts => {
        expect(opts).to.deep.equal({
          method: 'DELETE',
          url: [davEndpoint, 'calendars', userId, userId, eventId + '.ics'].join('/'),
          headers: {
            ESNToken: token
          }
        });

        done();
      });

      getModule().deleteEventInDefaultCalendar({ id: userId }, eventId);
    });

  });

  describe('The getMultipleEventsFromPaths function', function() {
    const buildRequestBody = eventPaths => JSON.stringify({ eventPaths });

    beforeEach(function() {
      request = {
        method: 'REPORT',
        url: `${davEndpoint}/calendars`,
        headers: {
          ESNToken: token,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      };
    });

    it('should return an empty array if there are no event paths', function(done) {
      getModule()
        .getMultipleEventsFromPaths(userId, [])
        .then(events => {
          expect(events).to.deep.equal([]);
          done();
        })
        .catch(err => done(err || 'should resolve'));
    });

    it('should reject if token retrieval fails', function(done) {
      authMock.token.getNewToken = sinon.spy((opts, callback) => callback(new Error()));

      getModule()
        .getMultipleEventsFromPaths(userId, [''])
        .catch(err => {
          expect(err).to.exist;
          expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
          expect(davServerMock.utils.getDavEndpoint).to.have.been.called;
          done();
        });
    });

    it('should call request with the built parameters and reject if it fails', function(done) {
      const eventPaths = ['/calendars/user1/calendar1/event1.ics'];

      request.body = buildRequestBody(eventPaths);

      const requestMock = (opts, callback) => {
        expect(opts).to.deep.equal(request);

        callback(new Error());
      };

      mockery.registerMock('request', requestMock);

      getModule()
        .getMultipleEventsFromPaths(userId, eventPaths)
        .catch(err => {
          expect(err).to.exist;
          expect(authMock.token.getNewToken).to.have.been.calledWith({ user: userId });
          expect(davServerMock.utils.getDavEndpoint).to.have.been.called;
          done();
        });
    });

    it('should return a list of events whose status are 200 OK"', function(done) {
      const eventPaths = [
        '/calendars/user1/calendar1/event1.ics',
        '/calendars/user1/calendar1/event2.ics',
        '/calendars/user1/calendar2/event3.ics',
        '/calendars/user1/calendar2/event4.ics'
      ];

      const responseBody = JSON.stringify({
        _links: { self: { href: '/calendars/user1.json' } },
        _embedded: {
          'dav:item': [
            {
              _links: { self: { href: eventPaths[0] } },
              etag: 'fffff-abcd1',
              data: 'calendar-data1',
              status: 200
            },
            {
              _links: { self: { href: eventPaths[1] } },
              status: 404
            },
            {
              _links: { self: { href: eventPaths[2] } },
              etag: 'fffff-abcd3',
              data: 'calendar-data3',
              status: 200
            },
            {
              _links: { self: { href: eventPaths[3] } },
              etag: 'fffff-abcd4',
              data: 'calendar-data4',
              status: 200
            }
          ]
        }
      });

      request.body = buildRequestBody(eventPaths);

      const requestMock = (opts, callback) => Promise.all([request.body, opts.body])
        .then(result => {
          request.body = result[0];
          opts.body = result[1];

          expect(opts).to.deep.equal(request);

          callback(null, { body: responseBody, statusCode: 200 }, responseBody);
        })
        .catch(err => callback(err));

      mockery.registerMock('request', requestMock);

      getModule()
        .getMultipleEventsFromPaths(userId, eventPaths)
        .then(events => {
          expect(events).to.deep.equal([{
            etag: 'fffff-abcd1',
            ical: 'BEGIN:CALENDAR-DATA1\r\nEND:CALENDAR-DATA1',
            path: eventPaths[0]
          }, {
            etag: 'fffff-abcd3',
            ical: 'BEGIN:CALENDAR-DATA3\r\nEND:CALENDAR-DATA3',
            path: eventPaths[2]
          },
          {
            etag: 'fffff-abcd4',
            ical: 'BEGIN:CALENDAR-DATA4\r\nEND:CALENDAR-DATA4',
            path: eventPaths[3]
          }]);
          done();
        })
        .catch(err => done(err || 'should resolve'));
    });
  });

  describe('The getAllCalendarsInDomainAsTechnicalUser function', function() {
    it('should reject if failed to get technical user token', function(done) {
      const domainId = 'aff2018';
      const error = new Error('something wrong');

      mockery.registerMock('../helpers/technical-user', () => ({
        getTechnicalUserToken: _domainId => {
          expect(_domainId).to.equal(domainId);

          return Promise.reject(error);
        }
      }));

      getModule().getAllCalendarsInDomainAsTechnicalUser(domainId)
        .catch(err => {
          expect(err).to.deep.equal(error);
          done();
        });
    });

    it('should send request with correct params to get all the calendars in a domain as a technical user', function(done) {
      const domainId = 'aff2018';
      const technicalUserToken = 'technicalToken';

      mockery.registerMock('../helpers/technical-user', () => ({
        getTechnicalUserToken: _domainId => {
          expect(_domainId).to.equal(domainId);

          return Promise.resolve({
            token: technicalUserToken
          });
        }
      }));

      mockery.registerMock('request', options => {
        expect(options).to.shallowDeepEqual({
          method: 'GET',
          url: `${davEndpoint}/calendars`,
          json: true,
          headers: {
            ESNToken: technicalUserToken,
            Accept: 'application/json'
          }
        });
        done();
      });

      getModule().getAllCalendarsInDomainAsTechnicalUser(domainId);
    });
  });

  describe('The getAllEventsInCalendarAsTechnicalUser function', function() {
    it('should reject if failed to get technical user token', function(done) {
      const domainId = 'aff2018';
      const calendarUri = 'foo';
      const calendarHomeId = 'bar';
      const error = new Error('something wrong');

      mockery.registerMock('../helpers/technical-user', () => ({
        getTechnicalUserToken: _domainId => {
          expect(_domainId).to.equal(domainId);

          return Promise.reject(error);
        }
      }));

      getModule().getAllEventsInCalendarAsTechnicalUser({ calendarUri, domainId, calendarHomeId })
        .catch(err => {
          expect(err).to.deep.equal(error);
          done();
        });
    });

    it('should send request with correct params to get all the events in a calendar as a technical user', function(done) {
      const domainId = 'aff2018';
      const technicalUserToken = 'technicalToken';
      const calendarUri = 'foo';
      const calendarHomeId = 'bar';

      mockery.registerMock('../helpers/technical-user', () => ({
        getTechnicalUserToken: _domainId => {
          expect(_domainId).to.equal(domainId);

          return Promise.resolve({
            token: technicalUserToken
          });
        }
      }));

      mockery.registerMock('request', options => {
        expect(options).to.shallowDeepEqual({
          method: 'GET',
          url: `${davEndpoint}/calendars/${calendarHomeId}/${calendarUri}.json?allEvents=true`,
          json: true,
          headers: {
            ESNToken: technicalUserToken,
            Accept: 'application/json'
          }
        });
        done();
      });

      getModule().getAllEventsInCalendarAsTechnicalUser({ calendarUri, domainId, calendarHomeId });
    });

    it('should send request with correct params to get all the events in a calendar as a technical user and return special occurs as separate events', function(done) {
      const domainId = 'aff2018';
      const technicalUserToken = 'technicalToken';
      const calendarId = 'foo';
      const calendarHomeId = 'bar';
      const normalEventICS = fs.readFileSync(__dirname + '/../../fixtures/meeting.ics', 'utf-8');
      const recurEventWithExceptionICS = fs.readFileSync(__dirname + '/../../fixtures/meeting-recurring-with-exception.ics', 'utf-8');
      const expectedEvents = [
        {
          ics: normalEventICS,
          userId: calendarHomeId,
          calendarId,
          eventUid: 'event1'
        },
        {
          ics: recurEventWithExceptionICS,
          userId: calendarHomeId,
          calendarId,
          eventUid: 'event2'
        },
        {
          ics: recurEventWithExceptionICS,
          userId: calendarHomeId,
          calendarId,
          eventUid: 'event2',
          recurrenceId: '2016-05-26T17:00:00Z'
        },
        {
          ics: recurEventWithExceptionICS,
          userId: calendarHomeId,
          calendarId,
          eventUid: 'event2',
          recurrenceId: '2016-05-27T17:00:00Z'
        }
      ];

      mockery.registerMock('../helpers/technical-user', () => ({
        getTechnicalUserToken: _domainId => {
          expect(_domainId).to.equal(domainId);

          return Promise.resolve({
            token: technicalUserToken
          });
        }
      }));

      const response = {
        statusCode: 200,
        body: {
          _embedded: {
            'dav:item': [
              {
                _links: { self: { href: `/calendars/${calendarHomeId}/${calendarId}/${expectedEvents[0].eventUid}.ics` }},
                data: normalEventICS
              },
              {
                _links: { self: { href: `/calendars/${calendarHomeId}/${calendarId}/event2.ics` }},
                data: recurEventWithExceptionICS
              }
            ]
          }
        }
      };

      mockery.registerMock('request', (options, callback) => {
        expect(options).to.shallowDeepEqual({
          method: 'GET',
          url: `${davEndpoint}/calendars/${calendarHomeId}/${calendarId}.json?allEvents=true`,
          json: true,
          headers: {
            ESNToken: technicalUserToken,
            Accept: 'application/json'
          }
        });

        return callback(null, response, response.body);
      });

      getModule().getAllEventsInCalendarAsTechnicalUser({ calendarUri: calendarId, domainId, calendarHomeId })
        .then(events => {
          expect(events).to.deep.equal(expectedEvents);
          done();
        })
        .catch(err => done(err || new Error('should not happen')));
    });

    it('should send request with correct params to get all the events in a calendar as a technical user and strip cancelled events by default', function(done) {
      const domainId = 'aff2018';
      const technicalUserToken = 'technicalToken';
      const calendarId = 'foo';
      const calendarHomeId = 'bar';
      const cancelledEventICS = fs.readFileSync(__dirname + '/../../fixtures/cancelledEvent.ics', 'utf-8');
      const normalEventICS = fs.readFileSync(__dirname + '/../../fixtures/meeting.ics', 'utf-8');
      const expectedEvents = [
        {
          ics: normalEventICS,
          userId: calendarHomeId,
          calendarId,
          eventUid: 'event2'
        }
      ];

      mockery.registerMock('../helpers/technical-user', () => ({
        getTechnicalUserToken: _domainId => {
          expect(_domainId).to.equal(domainId);

          return Promise.resolve({
            token: technicalUserToken
          });
        }
      }));

      const response = {
        statusCode: 200,
        body: {
          _embedded: {
            'dav:item': [
              {
                _links: { self: { href: `/calendars/${calendarHomeId}/${calendarId}/event1.ics` }},
                data: cancelledEventICS
              },
              {
                _links: { self: { href: `/calendars/${calendarHomeId}/${calendarId}/event2.ics` }},
                data: normalEventICS
              }
            ]
          }
        }
      };

      mockery.registerMock('request', (options, callback) => {
        expect(options).to.shallowDeepEqual({
          method: 'GET',
          url: `${davEndpoint}/calendars/${calendarHomeId}/${calendarId}.json?allEvents=true`,
          json: true,
          headers: {
            ESNToken: technicalUserToken,
            Accept: 'application/json'
          }
        });

        return callback(null, response, response.body);
      });

      getModule().getAllEventsInCalendarAsTechnicalUser({ calendarUri: calendarId, domainId, calendarHomeId })
        .then(events => {
          expect(events).to.deep.equal(expectedEvents);
          done();
        })
        .catch(err => done(err || new Error('should not happen')));
    });

    it('should send request with correct params to get all the events in a calendar as a technical user but cancelled events are not stripped when options.shouldStripCancelledEvents = false', function(done) {
      const domainId = 'aff2018';
      const technicalUserToken = 'technicalToken';
      const calendarId = 'foo';
      const calendarHomeId = 'bar';
      const cancelledEventICS = fs.readFileSync(__dirname + '/../../fixtures/cancelledEvent.ics', 'utf-8');
      const normalEventICS = fs.readFileSync(__dirname + '/../../fixtures/meeting.ics', 'utf-8');
      const expectedEvents = [
        {
          ics: cancelledEventICS,
          userId: calendarHomeId,
          calendarId,
          recurrenceId: '2019-12-18T09:30:00Z',
          eventUid: 'event1'
        },
        {
          ics: normalEventICS,
          userId: calendarHomeId,
          calendarId,
          eventUid: 'event2'
        }
      ];

      mockery.registerMock('../helpers/technical-user', () => ({
        getTechnicalUserToken: _domainId => {
          expect(_domainId).to.equal(domainId);

          return Promise.resolve({
            token: technicalUserToken
          });
        }
      }));

      const response = {
        statusCode: 200,
        body: {
          _embedded: {
            'dav:item': [
              {
                _links: { self: { href: `/calendars/${calendarHomeId}/${calendarId}/event1.ics` }},
                data: cancelledEventICS
              },
              {
                _links: { self: { href: `/calendars/${calendarHomeId}/${calendarId}/event2.ics` }},
                data: normalEventICS
              }
            ]
          }
        }
      };

      mockery.registerMock('request', (options, callback) => {
        expect(options).to.shallowDeepEqual({
          method: 'GET',
          url: `${davEndpoint}/calendars/${calendarHomeId}/${calendarId}.json?allEvents=true`,
          json: true,
          headers: {
            ESNToken: technicalUserToken,
            Accept: 'application/json'
          }
        });

        return callback(null, response, response.body);
      });

      getModule().getAllEventsInCalendarAsTechnicalUser({ calendarUri: calendarId, domainId, calendarHomeId, shouldStripCancelledEvents: false })
        .then(events => {
          expect(events).to.deep.equal(expectedEvents);
          done();
        })
        .catch(err => done(err || new Error('should not happen')));
    });
  });
});
