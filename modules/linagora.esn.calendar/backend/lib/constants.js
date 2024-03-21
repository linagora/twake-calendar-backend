'use strict';

module.exports = {
  EVENT_MAIL_LISTENER: {
    FALLBACK_EXCHANGE: 'james:events'
  },
  MODE: {
    IMPORT: 'import'
  },
  ATTENDEE: {
    ACTIONS: {
      ACCEPTED: 'ACCEPTED',
      DECLINED: 'DECLINED',
      TENTATIVE: 'TENTATIVE'
    }
  },
  NOTIFICATIONS: {
    EVENT_ADDED: 'events:event:add',
    EVENT_UPDATED: 'events:event:update',
    EVENT_DELETED: 'events:event:delete'
  },
  SEARCH: {
    INDEX_NAME: 'events.idx',
    TYPE_NAME: 'events',
    DEFAULT_LIMIT: 20,
    DEFAULT_SORT_KEY: 'start',
    DEFAULT_SORT_ORDER: 'desc'
  },
  VALARM_ACTIONS: {
    DISPLAY: 'DISPLAY',
    EMAIL: 'EMAIL'
  },
  TRANSP_VALUES: {
    TRANSPARENT: 'TRANSPARENT',
    OPAQUE: 'OPAQUE'
  },
  EVENTS: {
    CALENDAR: {
      CREATED: 'calendar:calendar:created',
      UPDATED: 'calendar:calendar:updated',
      DELETED: 'calendar:calendar:deleted'
    },
    SUBSCRIPTION: {
      CREATED: 'calendar:subscription:created',
      DELETED: 'calendar:subscription:deleted',
      UPDATED: 'calendar:subscription:updated'
    },
    EVENT: {
      CREATED: 'calendar:event:created',
      UPDATED: 'calendar:event:updated',
      REQUEST: 'calendar:event:request',
      CANCEL: 'calendar:event:cancel',
      DELETED: 'calendar:event:deleted',
      REPLY: 'calendar:event:reply'
    },
    ALARM: {
      CREATED: 'calendar:event:alarm:created',
      UPDATED: 'calendar:event:alarm:updated',
      DELETED: 'calendar:event:alarm:deleted',
      REQUEST: 'calendar:event:alarm:request',
      REPLY: 'calendar:event:alarm:reply',
      CANCEL: 'calendar:event:alarm:cancel'
    },
    NOTIFICATION_EMAIL: {
      SEND: 'calendar:event:notificationEmail:send'
    },
    RESOURCE: {
      CREATED: 'resource:created',
      UPDATED: 'resource:updated',
      DELETED: 'resource:deleted'
    },
    RESOURCE_EVENT: {
      CREATED: 'resource:calendar:event:created',
      ACCEPTED: 'resource:calendar:event:accepted',
      DECLINED: 'resource:calendar:event:declined'
    }
  },
  WEBSOCKET: {
    NAMESPACE: '/calendars',
    EVENTS: {
      EVENT_CREATED: 'calendar:ws:event:created',
      EVENT_UPDATED: 'calendar:ws:event:updated',
      EVENT_REQUEST: 'calendar:ws:event:request',
      EVENT_CANCEL: 'calendar:ws:event:cancel',
      EVENT_DELETED: 'calendar:ws:event:deleted',
      EVENT_REPLY: 'calendar:ws:event:reply'
    }
  },
  ALARM: {
    DEFAULT_CRON_EXPRESSION: '0 * * * * *',
    STATE: {
      DONE: 'done',
      ERROR: 'error',
      RUNNING: 'running',
      WAITING: 'waiting'
    }
  },
  RESOURCE: {
    TYPE: {
      CALENDAR: 'calendar'
    },
    DEFAULT_ICON: 'desktop-mac',
    ICONS_PATH: '/linagora.esn.resource/images/icon/',
    ERROR: {
      MAIL: {
        CREATED: {
          SUBJECT: 'Resource\'s calendar not created',
          MESSAGE: 'The resource\'s calendar has not been created'
        },
        UPDATED: {
          SUBJECT: 'Resource\'s calendar not updated',
          MESSAGE: 'The resource\'s calendar has not been updated'
        },
        REMOVED: {
          SUBJECT: 'Resource\'s calendar not removed',
          MESSAGE: 'The resource\'s calendar has not been removed'
        }
      }
    }
  },
  USER: {
    CREATED: 'users:user:add'
  },
  DEFAULT_CALENDAR_NAME: 'Events',
  DEFAULT_EVENT_SUMMARY: 'No title',
  RECUR_EVENT_MODIFICATION_TYPE: {
    MASTER_EVENT_UPDATE: 'MASTER_EVENT_UPDATE',
    FIRST_SPECIAL_OCCURS_ADDED: 'FIRST_SPECIAL_OCCURS_ADDED',
    FULL_REINDEX: 'FULL_REINDEX'
  }
};
