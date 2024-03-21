'use strict';

const q = require('q');

module.exports = function(dependencies, lib) {
  const filestore = dependencies('filestore');
  const logger = dependencies('logger');

  return {
    loadFileMetaData,
    validateImportRequest,
    validateFileType,
    validateTarget
  };

  function loadFileMetaData(req, res, next) {
    q.denodeify(filestore.getMeta)(req.body.fileId)
      .then(fileMetaData => {
        if (!fileMetaData) {
          return res.status(400).json({
            error: {
              code: 400,
              message: 'Bad Request',
              details: 'The input file does not exist'
            }
          });
        }

        req.fileMetaData = fileMetaData;
        next();
      })
      .catch(err => {
        const details = 'Error while loading file meta data';

        logger.error(details, err);

        res.status(500).json({
          error: {
            code: 500,
            message: 'Server Error',
            details
          }
        });
      });
  }

  function validateImportRequest(req, res, next) {
    const { fileId, target } = req.body;

    if (!fileId) {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Bad Request',
          details: 'fileId is required'
        }
      });
    }

    if (!target) {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Bad Request',
          details: 'target is required'
        }
      });
    }

    next();
  }

  function validateFileType(req, res, next) {
    if (!lib.importer.getFileHandler(req.fileMetaData.contentType)) {
      return res.status(400).json({
        error: {
          code: 400,
          message: 'Bad Request',
          details: `file type of the input file is not supported: ${req.fileMetaData.contentType}`
        }
      });
    }

    next();
  }

  function validateTarget(req, res, next) {
    const user = req.user;
    const { target } = req.body;
    const handler = lib.importer.getFileHandler(req.fileMetaData.contentType);

    q().then(() => handler.targetValidator(user, target))
      .then(valid => {
        if (valid) {
          next();
        } else {
          res.status(400).json({
            error: {
              code: 400,
              message: 'Bad Request',
              details: 'target is either in wrong format or not writtable'
            }
          });
        }
      })
      .catch(err => {
        const details = 'Error while validating target';

        logger.error(details, err);

        res.status(500).json({
          error: {
            code: 500,
            message: 'Server Error',
            details
          }
        });
      });
  }
};
