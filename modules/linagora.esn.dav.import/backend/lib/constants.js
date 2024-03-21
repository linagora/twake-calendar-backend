module.exports = {
  IMPORT_STATUS: {
    pending: 'pending',
    succeed: 'succeed',
    failed: 'failed'
  },
  JOB_QUEUE: {
    IMPORT_ITEM: 'linagora.esn.dav.import:import-item',
    IMPORT_REQUEST: 'linagora.esn.dav.import:import-request'
  },
  IMPORT_EMAIL: {
    TEMPLATE: {
      EVENT: 'event.import',
      CONTACT: 'contact.import'
    },
    DEFAULT_NOREPLY: 'no-reply@openpaas.org',
    DEFAULT_SUBJECT: 'Import reporting'
  },
  CHECK_TIME: 900000
};
