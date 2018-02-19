var FileIndex = require('./filesystem/fileIndex')
var Protocol = require('./protocol/protocol')

var def = require('./definitions')

function Editor () {
  var uuid = def.UUID()
  this.fileIndex = new FileIndex(uuid)

  this._protocol = new Protocol({
    uuid: uuid,
    supports: []
  })
}

module.exports = Editor
