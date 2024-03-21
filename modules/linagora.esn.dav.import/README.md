# linagora.esn.dav.import

Common stuffs used by Contact and Calendar to import contacts/events from VCF/ICS files to Sabre DAV

## Usage

Assume that you want to import contacts from vCard files:

__Step 1:__ register vCard file handler

```js
// in your backend
const davImport = dependencies('dav.import');

const vcardHandler = {
  contentType: 'text/vcard',

  /**
   * Parse lines in a chunk to DAV items
   * @param  {Array<String>} lines          - Lines to be read
   * @param  {Array<String>} remainingLines - Remaing lines from last chunk
   * @return {Object}                       - An object of:
   *                                          + items: DAV items read from lines
   *                                          + remainingLines: remaining lines of uncomplete DAV item
   */
  readLines(lines, remainingLines) {},

  /**
   * Import item to DAV server
   * @param  {String} item   - A single DAV item parsed from chunks
   * @param  {String} target - Address book or calendar path to import DAV item to
   * @param  {String} token  - To authenticate against DAV server
   * @return {Promise}       - Resolve on success
   */
  importItem(item, { target, token }) {},

  /**
   * Validate target path
   * @param  {Object} user      - The user object, can be used to check user's right on the target
   * @param  {String} target    - Address book or calendar path to import DAV items to
   * @return {Boolean|Promise}  - Return or resolve true if the target is valid
   */
  targetValidator(user, target) {}
};

davImport.lib.importer.addFileHandler(vcardHandler.contentType, vcardHandler);
```

__Step 2:__ use Angular service to import file

```js
var target = '/addressbooks/bookId/bookHome.json';

davImportService.importFromFile(file, target).then(function() {
  // import request submitted and will be process by job queue
});
```

## Licence

[Affero GPL v3](http://www.gnu.org/licenses/agpl-3.0.html)
