const util = require('util');
const path = require('path');
const Q = require('q');
const TEMPLATE_PATH = path.resolve(__dirname, '../../../templates/email');
const { IMPORT_EMAIL } = require('../constants');

module.exports = dependencies => {
  const helpers = dependencies('helpers');
  const emailModule = dependencies('email');
  const userModule = dependencies('user');
  const findByEmail = util.promisify(userModule.findByEmail);

  return {
    send
  };

  function send(userId, emailTemplateName, context = {}, headers = {}) {
    Q.all([
      Q.nfcall(userModule.get, userId),
      Q.nfcall(helpers.config.getBaseUrl, null),
      Q.nfcall(helpers.config.getNoReply)
    ]).spread((user, baseUrl, noReply) => resolveUserEmail(user)
        .then(userEmail => {
          const message = {
            encoding: 'base64',
            from: noReply || IMPORT_EMAIL.DEFAULT_NOREPLY,
            subject: IMPORT_EMAIL.DEFAULT_SUBJECT,
            to: userEmail.email,
            headers
          };

          const content = Object.assign({}, context, {
            baseUrl
          });

          return emailModule.getMailer(userEmail.user).sendHTML(
            message, {
              name: emailTemplateName,
              path: TEMPLATE_PATH
            }, {
              content
            }
          );
        })
    );
  }

  function resolveUserEmail(to) {
    if (to && to._id && to.preferredEmail) {
      return Promise.resolve({
        user: to,
        email: to.preferredEmail
      });
    }

    return findByEmail(to).then(user => ({
      user,
      email: to
    }));
  }
};
