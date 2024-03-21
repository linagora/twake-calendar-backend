var express = require('express');

module.exports = dependencies => {
  const controller = require('./controller')(dependencies);
  const calendarMW = require('./middleware')(dependencies);
  const authorizationMW = dependencies('authorizationMW');
  const collaborationMW = dependencies('collaborationMW');
  const davMiddleware = dependencies('davserver').davMiddleware;
  const tokenMW = dependencies('tokenMW');
  const router = express.Router();

  /**
   * @swagger
   * /{objectType}/{calendarId}/events :
   *   post:
   *     tags:
   *       - Calendar
   *     description: Creates a calendar event (called by the CalDAV server).
   *     parameters:
   *       - $ref: "#/parameters/calendar_user_id"
   *       - $ref: "#/parameters/calendar_collaboration_id"
   *       - $ref: "#/parameters/calendar_collabortion_object_type"
   *       - $ref: "#/parameters/calendar_calendar_id"
   *       - $ref: "#/parameters/calendar_calendar_event"
   *     responses:
   *       201:
   *         $ref: "#/responses/calendar_result"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       403:
   *         $ref: "#/responses/cm_403"
   *       404:
   *         $ref: "#/responses/cm_404"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.post('/:objectType/:id/events',
    authorizationMW.requiresAPILogin,
    collaborationMW.load,
    collaborationMW.requiresCollaborationMember,
    controller.dispatchEvent);

  /**
   * @swagger
   * /event/participation:
   *   get:
   *     tags:
   *       - Calendar
   *     description: Updates the attendee participation to an event (used by links in invitation emails).
   *     parameters:
   *       - $ref: "#/parameters/calendar_user_calendar_URI"
   *       - $ref: "#/parameters/calendar_user_id"
   *       - $ref: "#/parameters/calendar_user_uid"
   *       - $ref: "#/parameters/calendar_user_attendee_email"
   *       - $ref: "#/parameters/calendar_user_action"
   *       - $ref: "#/parameters/calendar_user_organizer_email"
   *       - $ref: "#/parameters/calendar_token"
   *     responses:
   *       200:
   *         $ref: "#/responses/cm_200"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/event/participation',
    authorizationMW.requiresJWT,
    calendarMW.decodeParticipationJWT,
    tokenMW.generateNewToken(),
    davMiddleware.getDavEndpoint,
    controller.changeParticipation);

  /**
   * @swagger
   * /{calendarHomeId}/{calendarId}/secret-link:
   *   post:
   *     tags:
   *       - Calendar
   *     description: Get the secret link to download the ics file of a calendar
   *     responses:
   *       200:
   *         $ref: "#/responses/cm_200"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/:calendarHomeId/:calendarId/secret-link',
    authorizationMW.requiresAPILogin,
    calendarMW.canGetSecretLink,
    controller.getSecretLink);

  /**
   * @swagger
   * /{calendarHomeId}/{calendarId}/calendar.ics:
   *   get:
   *     tags:
   *       - Calendar
   *     description: Download the ics file of a calendar
   *     parameters:
   *       - $ref: "#/parameters/secret_link_token"
   *     responses:
   *       200:
   *         $ref: "#/responses/cm_200"
   *       400:
   *         $ref: "#/responses/cm_400"
   *       401:
   *         $ref: "#/responses/cm_401"
   *       403:
   *         $ref: "#/responses/cm_403"
   *       500:
   *         $ref: "#/responses/cm_500"
   */
  router.get('/:calendarHomeId/:calendarId/calendar.ics',
    calendarMW.canDownloadIcsFile,
    tokenMW.generateNewToken(),
    davMiddleware.getDavEndpoint,
    controller.downloadIcsFile);

  return router;
};
