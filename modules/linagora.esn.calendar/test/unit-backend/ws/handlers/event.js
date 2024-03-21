'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('The websocket event handler module', function() {

  beforeEach(function() {
    var self = this;

    this.socketListeners = {};
    this.io = {
      of: function() {
        return {};
      }
    };
    this.helper = {
      getUserSocketsFromNamespace: function() {}
    };
    this.moduleHelpers.addDep('wsserver', {io: self.io, ioHelper: self.helper});
  });

  describe('The notify function', function() {
    var userId, shareeId, topic;

    beforeEach(function() {
      userId = '123';
      shareeId = '456';
      topic = 'mytopic';
    });

    it('should call getUserSocketsFromNamespace for the owner of the calendar and the sharees', function() {
      var message = {
        event: 'ICS',
        eventPath: `calendar/${userId}/events/1213.ics`,
        shareeIds: [
          `principals/users/${shareeId}`
        ]
      };
      var module = require(this.moduleHelpers.backendPath + '/ws/handlers/event')(this.moduleHelpers.dependencies);

      sinon.spy(this.helper, 'getUserSocketsFromNamespace');
      module.notify(topic, message);

      expect(this.helper.getUserSocketsFromNamespace.firstCall).to.have.been.calledWith(userId);
      expect(this.helper.getUserSocketsFromNamespace.secondCall).to.have.been.calledWith(shareeId);
    });

    it('should not emit in websocket if msg.import if truethy', function() {
      var websockets = [
        {emit: sinon.spy()}
      ];
      var message = {
        import: true,
        event: 'ICS',
        eventPath: `calendar/${userId}/events/1213.ics`,
        shareeIds: [
          `principals/users/${shareeId}`
        ]
      };
      var module = require(this.moduleHelpers.backendPath + '/ws/handlers/event')(this.moduleHelpers.dependencies);
      var stub = sinon.stub(this.helper, 'getUserSocketsFromNamespace');

      stub.returns(websockets);
      module.notify(topic, message);

      expect(websockets[0].emit).to.not.have.been.called;
    });

    it('should emit message on all the websockets', function() {
      var websockets = [
        {emit: sinon.spy()},
        {emit: sinon.spy()},
        {emit: sinon.spy()}
      ];
      var message = {
        event: 'ICS',
        eventPath: `calendar/${userId}/events/1213.ics`,
        shareeIds: [
          `principals/users/${shareeId}`
        ]
      };
      var module = require(this.moduleHelpers.backendPath + '/ws/handlers/event')(this.moduleHelpers.dependencies);
      var stub = sinon.stub(this.helper, 'getUserSocketsFromNamespace');

      stub.returns(websockets);
      module.notify(topic, message);

      websockets.forEach(function(websocket) {
        expect(websocket.emit).to.have.been.calledWith(topic, message);
      });
    });

    it('should not emit when eventPath is not defined', function() {
      const message = {};
      const module = require(this.moduleHelpers.backendPath + '/ws/handlers/event')(this.moduleHelpers.dependencies);

      sinon.spy(this.helper, 'getUserSocketsFromNamespace');
      module.notify(topic, message);

      expect(this.helper.getUserSocketsFromNamespace).to.not.have.been.called;
    });

    it('should not emit when eventPath === /', function() {
      const message = {
        eventPath: '/'
      };
      const module = require(this.moduleHelpers.backendPath + '/ws/handlers/event')(this.moduleHelpers.dependencies);

      sinon.spy(this.helper, 'getUserSocketsFromNamespace');
      module.notify(topic, message);

      expect(this.helper.getUserSocketsFromNamespace).to.not.have.been.called;
    });

    it('should not emit when eventPath.replace failed', function() {
      var message = {
        eventPath: {}
      };
      var module = require(this.moduleHelpers.backendPath + '/ws/handlers/event')(this.moduleHelpers.dependencies);

      sinon.spy(this.helper, 'getUserSocketsFromNamespace');
      module.notify(topic, message);

      expect(this.helper.getUserSocketsFromNamespace).to.not.have.been.called;
    });

    it('should delete the ids of the sharees in the event object', function() {
      var message = {
        event: 'ICS',
        eventPath: 'calendar/123/events/1213.ics',
        shareeIds: [
          'principals/users/shareeId'
        ]
      };
      var module = require(this.moduleHelpers.backendPath + '/ws/handlers/event')(this.moduleHelpers.dependencies);

      module.notify(topic, message);

      expect(message).to.be.deep.equal({
        event: 'ICS',
        eventPath: 'calendar/123/events/1213.ics'
      });
    });
  });
});
