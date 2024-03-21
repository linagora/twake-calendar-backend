const fileHandlerModule = require('../handler');
const { JOB_QUEUE } = require('../../constants');

module.exports = dependencies => {
  const filestore = dependencies('filestore');
  const jobqueue = dependencies('jobqueue').lib;
  const importRequestModule = require('../../import-request')(dependencies);
  const importItemModule = require('../../import-item')(dependencies);
  const email = require('../../email')(dependencies);

  return {
    name: JOB_QUEUE.IMPORT_REQUEST,
    handler: {
      handle,
      getTitle
    }
  };

  function handle(job) {
    const { requestId } = job.data;

    return importRequestModule.getById(requestId).then(processRequest);
  }

  function getTitle(jobData) {
    return `Import DAV items from file "${jobData.filename}"`;
  }

  function processRequest(importRequest) {
    return new Promise((resolve, reject) =>
      filestore.get(importRequest.fileId, (err, meta, stream) => {
        if (err) {
          return reject(err);
        }

        if (!meta) {
          return reject(new Error(`File does not exist or deleted: ${importRequest.fileId}`));
        }

        const fileHandler = fileHandlerModule.get(meta.contentType);

        if (!fileHandler) {
          return reject(new Error(`No file handler for file type: ${meta.contentType}`));
        }

        stream.setEncoding('utf8');

        const promises = [];
        let remainingLines = [];

        stream.on('data', chunk => {
          const lines = chunk.split('\n');

          // because chunks are not split by newline character, we join the last
          // line of previous chunk with first line of this chunk to have a complete line
          if (remainingLines.length && lines.length) {
            lines[0] = remainingLines.pop() + lines[0];
          }

          const results = fileHandler.readLines(lines, remainingLines);

          remainingLines = results.remainingLines;

          results.items.forEach(item => {
            promises.push(
              _createImportItem(importRequest.id, item, importRequest.fileId).then(_submitJob)
            );
          });
        });

        stream.on('end', () => {
          Promise.all(promises)
          .then(responses => {
            email.startWatchEndJob(importRequest.fileId, responses.length, importRequest.creator, importRequest.contentType);

            return responses;
          })
          .then(resolve, reject);
        });

        stream.on('error', err => {
          reject(err);
        });
      })
    );
  }

  function _createImportItem(requestId, item, batchId) {
    return importItemModule.create({
      request: requestId,
      rawData: item,
      batchId: batchId
    });
  }

  function _submitJob(requestItem) {
    return jobqueue.submitJob(JOB_QUEUE.IMPORT_ITEM, {
      itemId: requestItem.id
    });
  }
};
