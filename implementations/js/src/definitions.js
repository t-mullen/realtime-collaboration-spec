
var cuid = require('cuid')

module.exports.FileCreateEvent = function (newPath, file) {
  this.newPath = newPath
  this.file = file
}

module.exports.FileMoveEvent = function (oldPath, newPath, file) {
  this.oldPath = oldPath
  this.newPath = newPath
  this.file = file
}

module.exports.FileRemoveEvent = function (oldPath, file) {
  this.oldPath = oldPath
  this.file = file
}

module.exports.ChangeEvent = function (path, inserts, removes) {
  this.path = path
  this.inserts = inserts
  this.removes = removes
}

module.exports.ChangeInsertAtom = function (index, element) {
  this.index = index
  this.element = element
}

module.exports.ChangeRemoveAtom = function (index) {
  this.index = index
}

module.exports.CRDTMapSetEvent = function (key, value) {
  this.key = key
  this.value = value
}

module.exports.CRDTMapRemoveEvent = function (key, value) {
  this.key = key
  this.value = value
}

module.exports.CursorRemoveEvent = function (cursor) {
  this.cursor = cursor
}

module.exports.CursorAddEvent = function (cursor) {
  this.cursor = cursor
}

module.exports.CRDTSequenceInsertEvent = function (index, value) {
  this.index = index
  this.value = value
}

module.exports.CRDTSequenceRemoveEvent = function (index, value) {
  this.index = index
  this.value = value
}

module.exports.CRDTMapOperation = function (type, peerId, counter, element) {
  this.type = type
  this.peerId = peerId
  this.counter = counter
  this.element = element
}

module.exports.CRDTSequenceOperation = function (type, peerId, fileId, id) {
  this.type = type
  this.peerId = peerId
  this.fileId = fileId
  this.id = id
}

module.exports.CursorOperation = function (type, peerId, fileId, index) {
  this.type = type
  this.peerId = peerId
  this.fileId = fileId
  this.offset = offset
}

module.exports.Cursor = function (peerId, fileId, index) {
  this.peerId = peerId
  this.fileId = fileId
  this.offset = offset
}

module.exports.CursorAddEvent = function (fileId, cursor) {
  this.fileId = fileId
  this.cursor = cursor
}

module.exports.CursorRemoveEvent = function (fileId, cursor) {
  this.fileId = fileId
  this.cursor = cursor
}

module.exports.UUID = function () {
  return (cuid() + cuid()).slice(0, 32)
}
