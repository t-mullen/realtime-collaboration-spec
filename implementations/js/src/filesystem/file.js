var EventEmitter = require('nanobus')
var inherits = require('inherits')

var CRDTSequence = require('./../crdt/CRDTSequence')
var def = require('./../definitions')

inherits(File, EventEmitter)

function File(path, siteId, uuid) {

  this.removed = false
  this.path = path

  this._uuid = uuid
  this._sequence = new CRDTSequence(siteId, uuid)

  this._cursors = {}
}

File.prototype.getContent = function () {
  return this._sequence.content()
}

File.prototype.getCharAt = function (index) {
  return this._sequence.charAt(index)
}

File.prototype.getCursors = function () {
  return this._cursors
}

File.prototype.setCursor = function (cursor) {
  this._cursors.push(cursor)
  this.emit('cursor', new def.CursorMoveEvent(cursor.index))
}

File.prototype.insert = function (value, index) {
  var i = value.length
  while (i--) {
    this._sequence.insert(value, index)
  }
}

File.prototype.remove = function (index, length) {
  var i = length
  while (i--) {
    this._sequence.remove(index)
  }
}

File.prototype.replaceRange = function (value, index, length) {
  this.remove(value, length)
  this.insert(value, index)
}

File.prototype.delete = function () {
  this.removed = true
  this.emit('remove', new def.FileRemoveEvent(this.path, this))
}

File.prototype.applyOperation = function (operation) {
  this._sequence.applyOperation(operation)
}

module.exports = File
