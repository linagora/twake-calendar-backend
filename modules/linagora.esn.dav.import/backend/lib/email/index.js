'use strict';

const ICAL = require('@linagora/ical.js');
const _ = require('lodash');
const { IMPORT_STATUS, IMPORT_EMAIL, CHECK_TIME } = require('../constants');

module.exports = function(dependencies) {
  const logger = dependencies('logger');
  const sender = require('./sender')(dependencies);
  const importItemModule = require('../import-item')(dependencies);

  return {
    startWatchEndJob
  };

  function startWatchEndJob(batchId, jobLengthToWait, userId, importType) {
    logger.info('Start to watch the end of the jobs with batch ID : ' + batchId);

    const intervalObj = setInterval(() => {
      importItemModule.getFinishedJobByBatchId(batchId).then(res => {
        if (res.length > 0 && res.length === jobLengthToWait) {
          logger.info('The jobs with batch Id ' + batchId + ' is over');
          clearInterval(intervalObj);

          const [jobSucceed, jobFailed] = _.partition(res, job => job.status === IMPORT_STATUS.succeed);

          let jobFailedList = [];

          if (jobFailed.length > 0) {
            jobFailedList = _.map(jobFailed, job => _getJobEventProperty(job));
          }

          const emailTemplateName = importType === 'text/calendar' ? IMPORT_EMAIL.TEMPLATE.EVENT : IMPORT_EMAIL.TEMPLATE.CONTACT;

          sender.send(userId, emailTemplateName, { jobSucceed, jobFailedList });
        }
      });
    }, CHECK_TIME);
  }

  function _getJobEventProperty(job) {
    const vcalendar = ICAL.Component.fromString(job.rawData);
    const event = vcalendar.name === 'vcalendar' ? vcalendar.getFirstSubcomponent('vevent') : vcalendar;
    const icalEvent = new ICAL.Event(event);

    return {
      uid: icalEvent.uid,
      summary: icalEvent.summary,
      date: {
        start: icalEvent.startDate || null,
        end: icalEvent.startDate || null
      }
    };
  }
};
