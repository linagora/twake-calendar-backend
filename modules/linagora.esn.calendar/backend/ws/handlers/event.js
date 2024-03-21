const _ = require('lodash');
const WEBSOCKET = require('../../lib/constants').WEBSOCKET;

module.exports = dependencies => {
  const io = dependencies('wsserver').io;
  const ioHelper = dependencies('wsserver').ioHelper;
  const logger = dependencies('logger');

  return {
    notify
  };

  function notify(topic, msg) {
    let userIds;

    if (msg.import) {
      logger.debug('Imported events are not published to websockets');

      return;
    }

    try {
      userIds = [parseEventPath(msg.eventPath).userId];
    } catch (err) {
      logger.error('Error while parsing calendar event path', err);
    }

    if (!userIds) {
      return;
    }

    if (msg.shareeIds) {
      msg.shareeIds.forEach(shareePrincipals => userIds.push(parseUserPrincipal(shareePrincipals)));
    }

    delete msg.shareeIds;

    userIds.forEach(userId => {
      logger.debug(`Looking for websockets for user ${userId} for calendar event and type ${topic}`);
      const clientSockets = ioHelper.getUserSocketsFromNamespace(userId, io.of(WEBSOCKET.NAMESPACE).sockets) || [];

      logger.debug(`Sending calendar event of type ${topic} to ${clientSockets.length} websockets`);
      _.invokeMap(clientSockets, 'emit', topic, msg);
    });
  }

  function parseEventPath(eventPath) {
    if (!eventPath || eventPath === '/') {
      throw new Error(`Bad event path ${eventPath}`);
    }

    // The eventPath is in this form : /calendars/{{userId}}/{{calendarId}}/{{eventUid}}.ics
    const pathParts = eventPath.replace(/^\//, '').split('/');

    return {
      userId: pathParts[1],
      calendarId: pathParts[2],
      eventUid: pathParts[3].replace(/\.ics$/, '')
    };
  }

  function parseUserPrincipal(userPrincipal) {
    // The userPrincipal is in this form : principals/users/{{userId}}
    const pathParts = userPrincipal.split('/');

    return pathParts[2];
  }
};
