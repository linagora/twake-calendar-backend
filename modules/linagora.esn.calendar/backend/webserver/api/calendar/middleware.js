const { promisify } = require('util');

module.exports = dependencies => {
  const logger = dependencies('logger');
  const userModule = dependencies('user');
  const findUserById = promisify(userModule.get);

  return {
    decodeParticipationJWT,
    canGetSecretLink,
    canDownloadIcsFile
  };

  function decodeParticipationJWT(req, res, next) {
    const payload = req.user;
    let badRequest;

    if (!payload.calendarURI) {
      badRequest = 'Calendar ID is required';
    }
    if (!payload.uid) {
      badRequest = 'Event uid is required';
    }
    if (!payload.attendeeEmail) {
      badRequest = 'Attendee email is required';
    }
    if (!payload.action) {
      badRequest = 'Action is required';
    }
    if (!payload.organizerEmail) {
      badRequest = 'Organizer email is required';
    }
    if (badRequest) {
      return res.status(400).json({error: {code: 400, message: 'Bad request', details: badRequest}});
    }

    userModule.findByEmail(payload.organizerEmail, (err, organizer) => {
      if (err) {
        logger.error('Error while searching event organizer.', err);

        return res.status(500).json({error: {code: 500, message: 'Internal Server Error', details: 'Error while searching for the event organizer'}});
      }

      if (!organizer) {
        return res.status(400).json({error: {code: 400, message: 'Bad Request', details: 'Organizer email is not valid.'}});
      }

      req.eventPayload = payload;
      req.user = organizer;
      next();
    });
  }

  function canGetSecretLink(req, res, next) {
    if (String(req.params.calendarHomeId) !== String(req.user._id)) {
      return res.status(403).json({ error: { code: 403, message: 'Forbidden', details: 'Forbidden' } });
    }

    next();
  }

  function canDownloadIcsFile(req, res, next) {
    if (!req.query.token) {
      return res.status(403).json({ error: { code: 403, message: 'Forbidden', details: 'Forbidden' } });
    }

    findUserById(req.params.calendarHomeId)
      .then(user => {
        if (!user) {
          logger.error(`canDownloadIcsFile middleware: User with id ${req.params.calendarHomeId} could not be found`);

          return res.status(404).json({ error: { code: 404, message: 'Not Found', details: 'User not found' } });
        }

        req.user = user;

        next();
      })
      .catch(error => {
        logger.error('canDownloadIcsFile middleware: Error while searching for user', error);

        return res.status(500).json({ error: { code: 500, message: 'Internal Server Error', details: 'Error while searching for user' } });
      });
  }
};
