var FileIndex = require('./filesystem/fileIndex')
var Protocol = require('./protocol/protocol')

function Editor (uuid) {
  this.fileIndex = new FileIndex(uuid)
}

module.exports = Editor