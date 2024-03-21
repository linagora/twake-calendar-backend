const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const mockery = require('mockery');
const momentTimezone = require('moment-timezone');

momentTimezone.locale('en');

describe('The invitation email module', function() {
  let userMock, domainMock, helpersMock, authMock, emailMock, esnConfigMock, datetimeOptions, mjmlMock, emailEventHelperMock;
  let getModule;
  let transformedHTML;

  beforeEach(function() {
    authMock = {
      jwt: {
        generateWebToken: function(p, callback) {
          expect(p).to.exist;
          callback(null, 'token');
        }
      }
    };

    userMock = {
      getDisplayName: user => user.firstname + ' ' + user.lastname,
      get: function(id, callback) {
        return callback(null, {});
      },
      findByEmail: function(email, callback) {
        return callback(null, {});
      }
    };

    domainMock = {
      load: sinon.spy(function(domainId, callback) {
        callback(null, { _id: 'domainId' });
      })
    };

    helpersMock = {
      message: {
        messageSharesToTimelineTarget: function() {}
      },
      array: {
        isNullOrEmpty: function(array) {
          return (!Array.isArray(array) || array.length === 0);
        }
      },
      config: {
        getBaseUrl: function(user, callback) {
          callback(null, 'baseUrl');
        }
      }
    };

    emailMock = {
      getMailer: function() { return {}; }
    };

    datetimeOptions = {
      timeZone: 'UTC'
    };

    esnConfigMock = function(confName) {
      return {
        inModule: function(mod) {
          expect(mod).to.equal('core');

          if (confName === 'language') {
            return {
              forUser: () => {}
            };
          }

          return {
            forUser: () => ({
              get: () => Promise.resolve(datetimeOptions)
            })
          };
        }
      };
    };

    transformedHTML = '<span>transformed html</span>';

    mjmlMock = sinon.stub().returns({ html: transformedHTML });

    emailEventHelperMock = {
      getContentEventStartAndEndFromIcs: () => ({})
    };

    this.moduleHelpers.addDep('domain', domainMock);
    this.moduleHelpers.addDep('user', userMock);
    this.moduleHelpers.addDep('helpers', helpersMock);
    this.moduleHelpers.addDep('auth', authMock);
    this.moduleHelpers.addDep('email', emailMock);
    this.moduleHelpers.addDep('esn-config', esnConfigMock);
    this.moduleHelpers.addDep('i18n', this.helpers.requireBackend('core/i18n'));

    mockery.registerMock('../helpers/email-event', () => emailEventHelperMock);
    mockery.registerMock('mjml', mjmlMock);

    getModule = () => require(`${this.moduleHelpers.backendPath}/lib/invitation/email`)(this.moduleHelpers.dependencies);
  });

  function checkTemplateFn(templateFn) {
    const untransformedHTML = '<span>untransformed html</span>';
    const html = templateFn(untransformedHTML);

    expect(mjmlMock).to.have.been.calledWith(untransformedHTML);
    expect(html).to.equal(transformedHTML);
  }

  describe('The sendNotificationEmails function', function() {
    const organizer = {
      firstname: 'organizerFirstname',
      lastname: 'organizerLastname',
      emails: [
        'organizer@open-paas.org'
      ],
      preferredEmail: 'organizer@open-paas.org',
      email: 'organizer@open-paas.org',
      domains: [{ domain_id: 'domain123' }]
    };
    const attendee1 = {
      firstname: 'attendee1Firstname',
      lastname: 'attendee1Lastname',
      emails: [
        'attendee1@open-paas.org'
      ],
      domains: [{ domain_id: 'domain123' }]
    };
    const otherAttendee = {
      firstname: 'attendee2Firstname',
      lastname: 'attendee2Lastname',
      emails: [
        'attendee2@open-paas.org'
      ],
      domains: [{ domain_id: 'domain123' }]
    };
    const attendeeEmail = attendee1.emails[0];

    const ics = [
      'BEGIN:VCALENDAR',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      'UID:123123',
      'SUMMARY:description',
      'DTSTART:20150101T010101',
      'DTEND:20150101T020202',
      'ORGANIZER;CN="' + organizer.firstname + ' ' + organizer.lastname + '":mailto:' + organizer.emails[0],
      'ATTENDEE;CN="' + attendee1.firstname + ' ' + attendee1.lastname + '":mailto:' + attendee1.emails[0],
      'ATTENDEE;CN="' + otherAttendee.firstname + ' ' + otherAttendee.lastname + '":mailto:' + otherAttendee.emails[0],
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const isNewEvent = true;

    beforeEach(function() {
      userMock.findByEmail = function(email, callback) {
        if (typeof email !== 'string') return callback(null, null);

        return callback(null, organizer);
      };
    });

    describe('The common cases', function() {
      it('should reject if the provided sender is a User object', function(done) {
        getModule().sendNotificationEmails({ sender: {}, recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: 'ICS', calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('Sender must be a User object with at least one domain');
            done();
          });
      });

      it('should reject if there is no sender object provided and the sender email is not a string', function(done) {
        getModule().sendNotificationEmails({ senderEmail: {}, recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: 'ICS', calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('The senderEmail must be a string');
            done();
          });
      });

      it('should reject if the found sender is not a User object', function(done) {
        userMock.findByEmail = function(email, callback) {
          return callback(null, {});
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: 'ICS', calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('Sender must be a User object with at least one domain');
            done();
          });
      });

      it('should reject if the found sender is a User object but does not have a domain', function(done) {
        userMock.findByEmail = (email, callback) => {
          callback(null, { domains: [] });
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: 'ICS', calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('Sender must be a User object with at least one domain');
            done();
          });
      });

      it('should reject if the recipient email is not a string', function(done) {
        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: {}, method: 'REQUEST', ics: 'ICS', calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('The recipientEmail must be a string');
            done();
          });
      });

      it('should reject if method is not a string', function(done) {
        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: 'foo@bar.com', method: 123123, ics: 'ICS', calendarURI: 'calendarURI' })
        .then(() => done(new Error('should not resolve')))
        .catch(err => {
          expect(err).to.exist;
          expect(err.message).to.equal('The method must be a string');
          done();
        });
      });

      it('should reject if ics is not a string', function(done) {
        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: {}, calendarURI: 'calendarURI' })
        .then(() => done(new Error('should not resolve')))
        .catch(err => {
          expect(err).to.exist;
          expect(err.message).to.equal('The ics must be a string');
          done();
        });
      });

      it('should reject if calendarURI is not a string', function(done) {
        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: 'foo@bar.com', method: 'REQUEST', ics: 'ics', calendarURI: {} })
        .then(() => done(new Error('should not resolve')))
        .catch(err => {
          expect(err).to.exist;
          expect(err.message).to.equal('The calendarURI must be a string');
          done();
        });
      });

      it('should reject if there is an error while finding the sender by email', function(done) {
        userMock.findByEmail = function(email, callback) {
          callback(new Error('Error in findByEmail'));
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('Error in findByEmail');
            done();
          });
      });

      it('should reject if there is an error while finding the recipient by email', function(done) {
        let callCount = 0;

        userMock.findByEmail = function(email, callback) {
          if (callCount === 1) {
            expect(email).to.equal(attendeeEmail);

            return callback(new Error('Error in findByEmail'));
          }

          callback(null, { domains: [{ _id: 'domainId' }]});
          callCount++;
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('Error in findByEmail');
            done();
          });
      });

      it('should reject if the base url cannot be retrieved', function(done) {
        const sender = {
          domains: [{ _id: 'domainId' }],
          perferredDomainId: 'domainId'
        };

        userMock.findByEmail = (email, callback) => {
          callback(null, sender);
        };

        helpersMock.config.getBaseUrl = function(user, callback) {
          expect(user).to.equal(sender);
          callback(new Error('cannot get base_url'));
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('cannot get base_url');
            done();
          });
      });

      it('should reject if the sender domain cannot be retrieved', function(done) {
        const sender = {
          domains: [{ _id: 'domainId' }],
          preferredDomainId: 'domainId'
        };

        userMock.findByEmail = (email, callback) => {
          callback(null, sender);
        };

        domainMock.load = function(domainId, callback) {
          expect(domainId).to.equal(sender.preferredDomainId);
          callback(new Error('cannot get domain'));
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI' })
          .then(() => done(new Error('should not resolve')))
          .catch(err => {
            expect(err).to.exist;
            expect(err.message).to.equal('cannot get domain');
            done();
          });
      });

      it('should reject if an error happens during links generation', function(done) {
        userMock.findByEmail = function(email, callback) {
          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }

          return callback(null, otherAttendee);
        };

        authMock.jwt.generateWebToken = function(p, callback) {
          return callback(new Error());
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI' }).then(done, () => done());
      });

      it('should generate a token with proper information', function(done) {
        let findByEmailCallCount = 0;

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }

          callback(null, otherAttendee);
        };

        emailMock.getMailer = () => ({ sendWithCustomTemplateFunction: () => Promise.resolve() });

        authMock.jwt.generateWebToken = sinon.spy(function(token, callback) {
          callback(null, 'a_token');
        });

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI' })
          .then(() => {
            ['ACCEPTED', 'DECLINED', 'TENTATIVE'].forEach(action => testTokenWith(action, attendeeEmail));
            done();
          })
          .catch(err => done(err || new Error('should resolve')));

        function testTokenWith(action, attendeeEmail) {
          expect(authMock.jwt.generateWebToken).to.have.been.calledWith({
            action: action,
            attendeeEmail: attendeeEmail,
            calendarURI: 'calendarURI',
            organizerEmail: organizer.preferredEmail,
            uid: '123123'
          });
        }
      });

      it('should reject if there is an error while sending email', function(done) {
        userMock.findByEmail = function(email, callback) {
          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }
          callback(null, otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function() {
              return Promise.reject(new Error('an error'));
            }
          };
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI' }).then(done, () => done());
      });

      it('should work even if findByEmail doesn\'t find the attendee', function(done) {
        let findByEmailCallCount = 0;

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }
          // Purposely not finding this attendee
          callback(null, null);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);
              expect(email.to).to.equal(attendee1.emails[0]);
              expect(template).to.be.a.string;
              expect(locals).to.be.an('object');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: attendeeEmail, method: 'REQUEST', ics, calendarURI: 'calendarURI' })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should not send an email if the attendee is not involved in the event', function(done) {
        const emailAttendeeNotInvited = 'toto@open-paas.org';
        const sendHTML = sinon.spy();
        let findByEmailCallCount = 0;

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          callback();
        };

        emailMock.getMailer = function() {
          return {
            sendHTML
          };
        };

        getModule().sendNotificationEmails({ senderEmail: 'bar@foo.com', recipientEmail: emailAttendeeNotInvited, method: 'REQUEST', ics, calendarURI: 'calendarURI' })
          .then(() => done())
          .catch(err => {
            expect(err.message).to.match(/The recipient is not involved in the event/);
            expect(sendHTML).to.not.have.been.called;
            done();
          });
      });

      it('should send HTML email with correct parameters when the editor is an attendee', function(done) {
        const method = 'REQUEST';
        const attendeeEditor = {
          firstname: 'attendeeFistname',
          lastname: 'attendeeLastname',
          emails: ['attendee1@open-paas.org'],
          preferredEmail: 'attendee1@open-paas.org',
          domains: [{ domains_id: 'domain123' }]
        };
        let findByEmailCallCount = 0;

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 2) {
            return callback(null, organizer);
          }

          if (email === attendee1.emails[0]) {
            return callback(null, attendee1);
          }

          callback(null, otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(attendeeEditor.emails[0]);
              expect(email.to).to.equal(organizer.preferredEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from ' + organizer.firstname + ' ' + organizer.lastname + ': description',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.baseUrl).to.equal('http://localhost:8888');
              expect(locals.content.yes).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
              expect(locals.content.no).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
              expect(locals.content.maybe).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: attendee1.emails[0],
          recipientEmail: organizer.preferredEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should send HTML email with correct parameters using the provided sender email', function(done) {
        const method = 'REQUEST';
        let findByEmailCallCount = 0;

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback(null, (email === attendee1.emails[0]) ? attendee1 : otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendee1.emails[0]);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from ' + organizer.firstname + ' ' + organizer.lastname + ': description',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.seeInCalendarLink).to.be.defined;
              expect(locals.content.baseUrl).to.equal('http://localhost:8888');
              expect(locals.content.yes).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
              expect(locals.content.no).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
              expect(locals.content.maybe).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };
        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should send HTML email with correct parameters using the provided sender object', function(done) {
        const method = 'REQUEST';

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = sinon.spy(function(email, callback) {
          return callback(null, (email === attendee1.emails[0]) ? attendee1 : otherAttendee);
        });

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendee1.emails[0]);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from ' + organizer.firstname + ' ' + organizer.lastname + ': description',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.seeInCalendarLink).to.be.defined;
              expect(locals.content.baseUrl).to.equal('http://localhost:8888');
              expect(locals.content.yes).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
              expect(locals.content.no).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
              expect(locals.content.maybe).to.equal('http://localhost:8888/calendar/#/calendar/participation/?jwt=token');
              expect(userMock.findByEmail).to.have.been.calledOnce;
              expect(userMock.findByEmail).to.have.been.calledWith(attendeeEmail);

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };
        getModule().sendNotificationEmails({
          sender: organizer,
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should not include calendar link when attendee is external user', function(done) {
        const method = 'REQUEST';
        let findByEmailCallCount = 0;

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback();
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from ' + organizer.firstname + ' ' + organizer.lastname + ': description',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.seeInCalendarLink).to.not.be.defined;
              expect(locals.content.method).to.equal(method);

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should use the attendee\'s timezone and locale configuration if the attendee is an internal user', function(done) {
        const method = 'REQUEST';

        emailEventHelperMock = {
          getContentEventStartAndEndFromIcs: sinon.stub().returns({
            start: { date: '01/01/2015', time: '01:01', fullDateTime: '2015年1月1日星期四01点01分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' },
            end: { date: '01/01/2015', time: '02:02', fullDateTime: '2015年1月1日星期四02点02分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' }
          })
        };
        let findByEmailCallCount = 0;

        datetimeOptions = {
          timeZone: 'Asia/Shanghai',
          use24hourFormat: true
        };

        mockery.registerMock('./../i18n', () => ({
          getI18nForMailer: user => {
            expect(user).to.equal(attendee1);

            return Promise.resolve({
              i18n: {
                __: ({ phrase }) => phrase
              },
              locale: 'zh',
              translate: text => text
            });
          }
        }));

        mockery.registerMock('../helpers/email-event', () => emailEventHelperMock);

        esnConfigMock = function() {
          return {
            inModule: function(mod) {
              expect(mod).to.equal('core');

              return {
                forUser: (user, isUserWide) => {
                  expect(user).to.equal(attendee1);
                  expect(isUserWide).to.be.true;

                  return {
                    get: () => Promise.resolve(datetimeOptions)
                  };
                }
              };
            }
          };
        };

        this.moduleHelpers.addDep('esn-config', esnConfigMock);

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from {{organizerName}}: {{& summary}}',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.event.start).to.deep.equal({
                date: '01/01/2015',
                time: '01:01',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四01点01分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.event.end).to.deep.equal({
                date: '01/01/2015',
                time: '02:02',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四02点02分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.changes).to.be.undefined;

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendee1.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent
        })
          .then(() => {
            expect(emailEventHelperMock.getContentEventStartAndEndFromIcs).to.have.been.calledWith({
              ics,
              isAllDay: false,
              timezone: datetimeOptions.timeZone,
              use24hourFormat: true,
              locale: 'zh'
            });
            done();
          })
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should use the organizer\'s timezone and locale configuration if the attendee is an external user', function(done) {
        const method = 'REQUEST';

        emailEventHelperMock = {
          getContentEventStartAndEndFromIcs: sinon.stub().returns({
            start: { date: '01/01/2015', time: '01:01 SA', fullDateTime: 'Thứ năm ngày 1 tháng 1 năm 2015, 01:01 SA', fullDate: 'Thứ năm ngày 1 tháng 1 năm 2015', timezone: 'Asia/Ho_Chi_Minh' },
            end: { date: '01/01/2015', time: '02:02 SA', fullDateTime: 'Thứ năm ngày 1 tháng 1 năm 2015, 02:02 SA', fullDate: 'Thứ năm ngày 1 tháng 1 năm 2015', timezone: 'Asia/Ho_Chi_Minh' }
          })
        };
        let findByEmailCallCount = 0;

        datetimeOptions = {
          timeZone: 'Asia/Ho_Chi_Minh'
        };

        mockery.registerMock('./../i18n', () => ({
          getI18nForMailer: user => {
            expect(user).to.be.undefined;

            return Promise.resolve({
              i18n: {
                __: ({ phrase }) => phrase
              },
              locale: 'vi',
              translate: text => text
            });
          }
        }));

        mockery.registerMock('../helpers/email-event', () => emailEventHelperMock);

        esnConfigMock = function() {
          return {
            inModule: function(mod) {
              expect(mod).to.equal('core');

              return {
                forUser: (user, isUserWide) => {
                  expect(user).to.equal(organizer);
                  expect(isUserWide).to.be.true;

                  return {
                    get: () => Promise.resolve(datetimeOptions)
                  };
                }
              };
            }
          };
        };

        this.moduleHelpers.addDep('esn-config', esnConfigMock);

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback();
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from {{organizerName}}: {{& summary}}',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.event.start).to.deep.equal({
                date: '01/01/2015',
                time: '01:01 SA',
                timezone: 'Asia/Ho_Chi_Minh',
                fullDateTime: 'Thứ năm ngày 1 tháng 1 năm 2015, 01:01 SA',
                fullDate: 'Thứ năm ngày 1 tháng 1 năm 2015'
              });
              expect(locals.content.event.end).to.deep.equal({
                date: '01/01/2015',
                time: '02:02 SA',
                timezone: 'Asia/Ho_Chi_Minh',
                fullDateTime: 'Thứ năm ngày 1 tháng 1 năm 2015, 02:02 SA',
                fullDate: 'Thứ năm ngày 1 tháng 1 năm 2015'
              });

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent
        })
          .then(() => {
            expect(emailEventHelperMock.getContentEventStartAndEndFromIcs).to.have.been.calledWith({
              ics,
              isAllDay: false,
              timezone: datetimeOptions.timeZone,
              use24hourFormat: undefined,
              locale: 'vi'
            });
            done();
          })
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should include the changes correctly if there\'s any when the method is REQUEST', function(done) {
        const method = 'REQUEST';
        const changes = {
          dtstart: {
            previous: {
              date: '2015-01-01T01:00:00.000',
              isAllDay: false,
              timezone: 'Asia/Shanghai'
            },
            current: {
              date: '2015-01-01T01:01:00.000',
              isAllDay: false,
              timezone: 'Asia/Shanghai'
            }
          },
          dtend: {
            previous: {
              date: '2015-01-01T02:00:00.000',
              isAllDay: false,
              timezone: 'Asia/Shanghai'
            },
            current: {
              date: '2015-01-01T02:02:00.000',
              isAllDay: false,
              timezone: 'Asia/Shanghai'
            }
          },
          location: {
            previous: 'Beijing',
            current: 'Shanghai'
          }
        };

        emailEventHelperMock = {
          getContentEventStartAndEnd: sinon.stub().returns({
            start: { date: '01/01/2015', time: '01:00', fullDateTime: '2015年1月1日星期四01点00分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' },
            end: { date: '01/01/2015', time: '02:00', fullDateTime: '2015年1月1日星期四02点00分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' }
          }),
          getContentEventStartAndEndFromIcs: sinon.stub().returns({
            start: { date: '01/01/2015', time: '01:01', fullDateTime: '2015年1月1日星期四01点01分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' },
            end: { date: '01/01/2015', time: '02:02', fullDateTime: '2015年1月1日星期四02点02分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' }
          })
        };
        let findByEmailCallCount = 0;

        datetimeOptions = {
          timeZone: 'Asia/Shanghai',
          use24hourFormat: true
        };

        mockery.registerMock('./../i18n', () => ({
          getI18nForMailer: user => {
            expect(user).to.equal(attendee1);

            return Promise.resolve({
              i18n: {
                __: ({ phrase }) => phrase
              },
              locale: 'zh',
              translate: text => text
            });
          }
        }));

        mockery.registerMock('../helpers/email-event', () => emailEventHelperMock);

        esnConfigMock = function() {
          return {
            inModule: function(mod) {
              expect(mod).to.equal('core');

              return {
                forUser: (user, isUserWide) => {
                  expect(user).to.equal(attendee1);
                  expect(isUserWide).to.be.true;

                  return {
                    get: () => Promise.resolve(datetimeOptions)
                  };
                }
              };
            }
          };
        };

        this.moduleHelpers.addDep('esn-config', esnConfigMock);

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from {{organizerName}}: {{& summary}}',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.event.start).to.deep.equal({
                date: '01/01/2015',
                time: '01:01',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四01点01分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.event.end).to.deep.equal({
                date: '01/01/2015',
                time: '02:02',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四02点02分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.changes.location).to.deep.equal(changes.location);
              expect(locals.content.changes.isOldEventAllDay).to.equal(false);
              expect(locals.content.changes.dtstart.previous).to.deep.equal({
                date: '01/01/2015',
                time: '01:00',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四01点00分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.changes.dtend.previous).to.deep.equal({
                date: '01/01/2015',
                time: '02:00',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四02点00分',
                fullDate: '2015年1月1日星期四'
              });

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendee1.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent,
          changes
        })
          .then(() => {
            expect(emailEventHelperMock.getContentEventStartAndEnd).to.have.been.calledTwice;
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].start._i).to.equal('2015-01-01T01:00:00.000');
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].isAllDay).to.equal(false);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].timezone).to.equal(datetimeOptions.timeZone);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].use24hourFormat).to.equal(true);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].locale).to.equal('zh');
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(1).args[0].end._i).to.equal('2015-01-01T02:00:00.000');
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(1).args[0].isAllDay).to.equal(false);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(1).args[0].timezone).to.equal(datetimeOptions.timeZone);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(1).args[0].use24hourFormat).to.equal(true);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(1).args[0].locale).to.equal('zh');
            expect(emailEventHelperMock.getContentEventStartAndEndFromIcs).to.have.been.calledWith({
              ics,
              isAllDay: false,
              timezone: datetimeOptions.timeZone,
              use24hourFormat: true,
              locale: 'zh'
            });
            done();
          })
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should include the changes correctly if there\'s changes about DTSTART but not DTEND when the method is REQUEST', function(done) {
        const method = 'REQUEST';
        const changes = {
          dtstart: {
            previous: {
              date: '2015-01-01T01:00:00.000',
              isAllDay: false,
              timezone: 'Asia/Shanghai'
            },
            current: {
              date: '2015-01-01T01:01:00.000',
              isAllDay: false,
              timezone: 'Asia/Shanghai'
            }
          },
          location: {
            previous: 'Beijing',
            current: 'Shanghai'
          }
        };

        emailEventHelperMock = {
          getContentEventStartAndEnd: sinon.stub().returns({
            start: { date: '01/01/2015', time: '01:00', fullDateTime: '2015年1月1日星期四01点00分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' }
          }),
          getContentEventStartAndEndFromIcs: sinon.stub().returns({
            start: { date: '01/01/2015', time: '01:01', fullDateTime: '2015年1月1日星期四01点01分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' },
            end: { date: '01/01/2015', time: '02:02', fullDateTime: '2015年1月1日星期四02点02分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' }
          })
        };
        let findByEmailCallCount = 0;

        datetimeOptions = {
          timeZone: 'Asia/Shanghai',
          use24hourFormat: true
        };

        mockery.registerMock('./../i18n', () => ({
          getI18nForMailer: user => {
            expect(user).to.equal(attendee1);

            return Promise.resolve({
              i18n: {
                __: ({ phrase }) => phrase
              },
              locale: 'zh',
              translate: text => text
            });
          }
        }));

        mockery.registerMock('../helpers/email-event', () => emailEventHelperMock);

        esnConfigMock = function() {
          return {
            inModule: function(mod) {
              expect(mod).to.equal('core');

              return {
                forUser: (user, isUserWide) => {
                  expect(user).to.equal(attendee1);
                  expect(isUserWide).to.be.true;

                  return {
                    get: () => Promise.resolve(datetimeOptions)
                  };
                }
              };
            }
          };
        };

        this.moduleHelpers.addDep('esn-config', esnConfigMock);

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from {{organizerName}}: {{& summary}}',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.event.start).to.deep.equal({
                date: '01/01/2015',
                time: '01:01',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四01点01分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.event.end).to.deep.equal({
                date: '01/01/2015',
                time: '02:02',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四02点02分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.changes.location).to.deep.equal(changes.location);
              expect(locals.content.changes.isOldEventAllDay).to.equal(false);
              expect(locals.content.changes.dtstart.previous).to.deep.equal({
                date: '01/01/2015',
                time: '01:00',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四01点00分',
                fullDate: '2015年1月1日星期四'
              });

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendee1.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent,
          changes
        })
          .then(() => {
            expect(emailEventHelperMock.getContentEventStartAndEnd).to.have.been.calledOnce;
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].start._i).to.equal('2015-01-01T01:00:00.000');
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].isAllDay).to.equal(false);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].timezone).to.equal(datetimeOptions.timeZone);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].use24hourFormat).to.equal(true);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].locale).to.equal('zh');
            expect(emailEventHelperMock.getContentEventStartAndEndFromIcs).to.have.been.calledWith({
              ics,
              isAllDay: false,
              timezone: datetimeOptions.timeZone,
              use24hourFormat: true,
              locale: 'zh'
            });
            done();
          })
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should include the changes correctly if there\'s changes about DTEND but not DTSTART when the method is REQUEST', function(done) {
        const method = 'REQUEST';
        const changes = {
          dtend: {
            previous: {
              date: '2015-01-01T02:00:00.000',
              isAllDay: false,
              timezone: 'Asia/Shanghai'
            },
            current: {
              date: '2015-01-01T02:02:00.000',
              isAllDay: false,
              timezone: 'Asia/Shanghai'
            }
          },
          location: {
            previous: 'Beijing',
            current: 'Shanghai'
          }
        };

        emailEventHelperMock = {
          getContentEventStartAndEnd: sinon.stub().returns({
            end: { date: '01/01/2015', time: '02:00', fullDateTime: '2015年1月1日星期四02点00分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' }
          }),
          getContentEventStartAndEndFromIcs: sinon.stub().returns({
            start: { date: '01/01/2015', time: '01:01', fullDateTime: '2015年1月1日星期四01点01分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' },
            end: { date: '01/01/2015', time: '02:02', fullDateTime: '2015年1月1日星期四02点02分', fullDate: '2015年1月1日星期四', timezone: 'Asia/Shanghai' }
          })
        };
        let findByEmailCallCount = 0;

        datetimeOptions = {
          timeZone: 'Asia/Shanghai',
          use24hourFormat: true
        };

        mockery.registerMock('./../i18n', () => ({
          getI18nForMailer: user => {
            expect(user).to.equal(attendee1);

            return Promise.resolve({
              i18n: {
                __: ({ phrase }) => phrase
              },
              locale: 'zh',
              translate: text => text
            });
          }
        }));

        mockery.registerMock('../helpers/email-event', () => emailEventHelperMock);

        esnConfigMock = function() {
          return {
            inModule: function(mod) {
              expect(mod).to.equal('core');

              return {
                forUser: (user, isUserWide) => {
                  expect(user).to.equal(attendee1);
                  expect(isUserWide).to.be.true;

                  return {
                    get: () => Promise.resolve(datetimeOptions)
                  };
                }
              };
            }
          };
        };

        this.moduleHelpers.addDep('esn-config', esnConfigMock);

        helpersMock.config.getBaseUrl = function(user, callback) {
          callback(null, 'http://localhost:8888');
        };

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(email.from).to.equal(organizer.emails[0]);

              expect(email.to).to.equal(attendeeEmail);
              expect(email).to.shallowDeepEqual({
                subject: 'New event from {{organizerName}}: {{& summary}}',
                encoding: 'base64',
                alternatives: [{
                  content: ics,
                  contentType: `text/calendar; charset=UTF-8; method=${method}`
                }],
                attachments: [{
                  filename: 'meeting.ics',
                  content: ics,
                  contentType: 'application/ics'
                }]
              });
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(locals).to.be.an('object');
              expect(locals.filter).is.a.function;
              expect(locals.content.method).to.equal(method);
              expect(locals.content.event.start).to.deep.equal({
                date: '01/01/2015',
                time: '01:01',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四01点01分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.event.end).to.deep.equal({
                date: '01/01/2015',
                time: '02:02',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四02点02分',
                fullDate: '2015年1月1日星期四'
              });
              expect(locals.content.changes.location).to.deep.equal(changes.location);
              expect(locals.content.changes.isOldEventAllDay).to.equal(false);
              expect(locals.content.changes.dtend.previous).to.deep.equal({
                date: '01/01/2015',
                time: '02:00',
                timezone: 'Asia/Shanghai',
                fullDateTime: '2015年1月1日星期四02点00分',
                fullDate: '2015年1月1日星期四'
              });

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendee1.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent,
          changes
        })
          .then(() => {
            expect(emailEventHelperMock.getContentEventStartAndEnd).to.have.been.calledOnce;
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].end._i).to.equal('2015-01-01T02:00:00.000');
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].isAllDay).to.equal(false);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].timezone).to.equal(datetimeOptions.timeZone);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].use24hourFormat).to.equal(true);
            expect(emailEventHelperMock.getContentEventStartAndEnd.getCall(0).args[0].locale).to.equal('zh');
            expect(emailEventHelperMock.getContentEventStartAndEndFromIcs).to.have.been.calledWith({
              ics,
              isAllDay: false,
              timezone: datetimeOptions.timeZone,
              use24hourFormat: true,
              locale: 'zh'
            });
            done();
          })
          .catch(err => done(err || new Error('should resolve')));
      });
    });

    describe('when method is REQUEST', function() {
      let method;

      beforeEach(function() {
        method = 'REQUEST';
      });

      it('should send email with new event subject and template if it\'s a new event for the attendee', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/request-new-event.ics', 'utf-8');
        let findByEmailCallCount = 0;

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn }) {
              expect(template.name).to.equal('event.invitation');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('New event from ' + organizer.firstname + ' ' + organizer.lastname + ': Démo OPENPAAS');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should send HTML email with event update subject and template if the guest existed in the updated event', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/request-event-update.ics', 'utf-8');
        const isNewEvent = false;
        let findByEmailCallCount = 0;

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          return callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn }) {
              expect(template.name).to.equal('event.update');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('Event Démo OPENPAAS from ' + organizer.firstname + ' ' + organizer.lastname + ' updated');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI',
          domain: null,
          isNewEvent
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });
    });

    describe('when method is REPLY', function() {
      let method;

      beforeEach(function() {
        method = 'REPLY';
      });

      it('should send email with reply event subject and template', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/reply.ics', 'utf-8');
        let findByEmailCallCount = 0;

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(template.name).to.equal('event.reply');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('Accepted: Démo OPENPAAS (organizerFirstname organizerLastname)');
              expect(locals.content.rawInviteMessage).to.equal('has accepted this invitation');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should send email with correct content', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/reply.ics', 'utf-8');
        let findByEmailCallCount = 0;

        attendee1.domains = [{ domain_id: 'domain_id' }];
        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 2) {
            return callback(null, organizer);
          }

          callback(null, attendee1);
        };

        const editor = {
          displayName: attendee1.firstname + ' ' + attendee1.lastname,
          email: attendee1.emails[0]
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(template.name).to.equal('event.reply');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('Participation updated: Démo OPENPAAS');
              expect(locals.content.editor).to.deep.equal(editor);
              expect(locals.content.rawInviteMessage).to.equal('has changed his participation');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: attendee1.emails[0],
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should only send messages to involved users', function(done) {
        let getMailerCallCount = 0;
        let findByEmailCallCount = 0;
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/involved.ics', 'utf-8');

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1 && email === 'attendee1@open-paas.org') {
            return callback(null, attendee1);
          }

          callback(null, otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, templateFn }) {
              getMailerCallCount++;
              if (getMailerCallCount === 1) {
                expect(email.to).to.deep.equal(attendee1.emails[0]);
              }

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: attendee1.emails[0],
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => {
          expect(getMailerCallCount).to.equal(1);
          done();
        }, done);
      });
    });

    describe('when method is COUNTER', function() {
      let method;

      beforeEach(function() {
        method = 'COUNTER';
      });

      it('should send email with reply event subject and template', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/counter.ics', 'utf-8');
        let findByEmailCallCount = 0;

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn }) {
              expect(template.name).to.equal('event.counter');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('New changes proposed to event Démo OPENPAAS');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should send email with correct content', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/counter.ics', 'utf-8');
        let findByEmailCallCount = 0;

        attendee1.domains = [{ domain_id: 'domain_id' }];
        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 2) {
            return callback(null, organizer);
          }

          callback(null, attendee1);
        };

        const editor = {
          displayName: attendee1.firstname + ' ' + attendee1.lastname,
          email: attendee1.emails[0]
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(template.name).to.equal('event.counter');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('New changes proposed to event Démo OPENPAAS');
              expect(locals.content.event.comment).to.contains('This demo is going to be awesome!');
              expect(locals.content.editor).to.deep.equal(editor);

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: attendee1.emails[0],
          recipientEmail: organizer.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI'
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should send email with correct content including the \'old\' event', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/counter.ics', 'utf-8');
        const oldIcs = ics;
        let findByEmailCallCount = 0;

        attendee1.domains = [{ domain_id: 'domain_id' }];
        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 2) {
            return callback(null, organizer);
          }

          callback(null, attendee1);
        };

        const editor = {
          displayName: attendee1.firstname + ' ' + attendee1.lastname,
          email: attendee1.emails[0]
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn, locals }) {
              expect(template.name).to.equal('event.counter');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('New changes proposed to event Démo OPENPAAS');
              expect(locals.content.event.comment).to.contains('This demo is going to be awesome!');
              expect(locals.content.editor).to.deep.equal(editor);
              expect(locals.content.oldEvent.summary).to.equal('Démo OPENPAAS');
              expect(locals.content.oldEvent.isLocationAValidURL).to.be.true;
              expect(locals.content.oldEvent.isLocationAnAbsoluteURL).to.be.true;
              expect(locals.content.oldEvent.start.date).to.equal('06/12/2015');
              expect(locals.content.oldEvent.start.time).to.equal('1:00 PM');
              expect(locals.content.oldEvent.end.date).to.equal('06/12/2015');
              expect(locals.content.oldEvent.end.time).to.equal('1:30 PM');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: attendee1.emails[0],
          recipientEmail: organizer.emails[0],
          method,
          ics,
          oldIcs,
          calendarURI: 'calendarURI'
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });

      it('should only send messages to organizer', function(done) {
        let getMailerCallCount = 0;
        let findByEmailCallCount = 0;
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/counter.ics', 'utf-8');

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 2 || email === 'organizer@open-paas.org') {
            return callback(null, organizer);
          }

          callback(null, otherAttendee);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email }) {
              getMailerCallCount++;
              if (getMailerCallCount === 1) {
                expect(email.to).to.deep.equal(organizer.emails[0]);
              }

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: attendee1.emails[0],
          recipientEmail: organizer.emails[0],
          method,
          ics,
          calendarURI: 'calendarURI'
        }).then(() => {
          expect(getMailerCallCount).to.equal(1);
          done();
        }, done);
      });
    });

    describe('when method is CANCEL', function() {
      let method;

      beforeEach(function() {
        method = 'CANCEL';
      });

      it('should send HTML email with cancel event subject', function(done) {
        const ics = fs.readFileSync(__dirname + '/../../../fixtures/cancel.ics', 'utf-8');
        let findByEmailCallCount = 0;

        userMock.findByEmail = function(email, callback) {
          findByEmailCallCount++;

          if (findByEmailCallCount === 1) {
            return callback(null, organizer);
          }

          callback(null, attendee1);
        };

        emailMock.getMailer = function() {
          return {
            sendWithCustomTemplateFunction: function({ message: email, template, templateFn }) {
              expect(template.name).to.equal('event.cancel');
              expect(template.path).to.match(/templates\/email/);
              expect(email.subject).to.equal('Event Démo OPENPAAS from ' + organizer.firstname + ' ' + organizer.lastname + ' canceled');

              checkTemplateFn(templateFn);

              return Promise.resolve();
            }
          };
        };

        getModule().sendNotificationEmails({
          senderEmail: 'bar@foo.com',
          recipientEmail: attendeeEmail,
          method,
          ics,
          calendarURI: 'calendarURI'
        })
          .then(done)
          .catch(err => done(err || new Error('should resolve')));
      });
    });
  });
});
