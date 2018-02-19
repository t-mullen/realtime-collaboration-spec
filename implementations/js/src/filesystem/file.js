var EventEmitter = require('nanobus')
var inherits = require('inherits')

var CRDTSequence = require('./../crdt/CRDTSequence')
var def = require('./../definitions')

inherits(File, EventEmitter)

function File (path, siteId, uuid) {
  EventEmitter.call(this)

  this.removed = false
  this.path = path

  this._uuid = uuid
  this._siteId = siteId
  this._sequence = new CRDTSequence(siteId, uuid)

  this._cursors = {}
}

File.prototype.getContent = function () {
  return this._sequence.content()
}

File.prototype.getCharAt = function (offset) {
  return this._sequence.charAt(offset)
}

File.prototype.getCursors = function () {
  // Turns {peerId: [offset, offset, offset]} into [Cursor, Cursor, Cursor]
  return [].concat.apply([], Object.keys(this._cursors).map(key => {
    return this._cursors[key].map(offset => new def.Cursor(key, this._uuid, offset))
  }))
}

File.prototype.addCursor = function (offset) {
  this._addCursor(offset, this._siteId)
  this.emit('operation', new def.CursorOperation('remove', this._siteId, this._uuid, offset))
}

File.prototype._addCursor = function (offset, peerId) {
  this._cursors[peerId] = this._cursors[peerId] || []
  this._cursors[peerId].push(offset)
}

File.prototype.removeCursor = function (offset) {
  this._removeCursor(offset, this._siteId)
  this.emit('operation', new def.CursorOperation('remove', this._siteId, this._uuid, offset))
}

File.prototype._removeCursor = function (offset, peerId) {
  if (!this._cursors[peerId]) {
    var i = this._cursors[peerId].indexOf(offset)
    this._cursors[peerId].splice(i, 1)
  }
}

File.prototype.write = function (offset, value) {
  var i = value.length
  while (i--) {
    this._sequence.insert(offset, value)
  }
}

File.prototype.remove = function (offset, length) {
  var i = length
  while (i--) {
    this._sequence.remove(offset)
  }
}

File.prototype.replaceRange = function (value, offset, length) {
  this.remove(value, length)
  this.insert(offset, value)
}

File.prototype.delete = function () {
  this.removed = true
  this.emit('remove', new def.FileRemoveEvent(this.path, this))
}

File.prototype.applyOperation = function (operation) {
  if (operation.offset) {
    this._addCursor(operation.offset, operation.peerId)
  } else {
    this._sequence.applyOperation(operation)
  }
}

module.exports = File
