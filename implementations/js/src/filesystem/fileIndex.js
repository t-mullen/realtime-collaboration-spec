var EventEmitter = require('nanobus')
var inherits = require('inherits')

var def = require('./../definitions')
var File = require('./file')
var CRDTMap = require('./../crdt/CRDTMap')

inherits(FileIndex, EventEmitter)

function FileIndex (uuid) {
  if (!(this instanceof FileIndex)) return new FileIndex(uuid)

  EventEmitter.call(this)

  this._uuid = uuid
  this._counter = 0
  this._map = new CRDTMap(uuid)
  this._files = {}

  this._map.on('set', this._onSet.bind(this))
  this._map.on('remove', this._onRemove.bind(this))
}

FileIndex.prototype._onSet = function (event) {
  var path = event.key
  var fileId = event.value
  var file = this._files[fileId]
  if (file) {
    this.emit('move', new def.FileMoveEvent(file.path, path, file))
    file.path = path
  } else {
    file = new File(path, this._uuid, fileId)
    this._files[fileId] = file
    this.emit('create', new def.FileCreateEvent(path, file))
  }
}

FileIndex.prototype._onRemove = function (event) {
  var fileId = event.value
  var file = this._files[fileId]
  file.delete()
  delete this._files[fileId]
  this.emit('remove', new def.FileRemoveEvent(file.path, file))
}

FileIndex.prototype.createFile = function (path) {
  var uuid = this._uuid + this._counter++
  var newFile = new File(path, this._uuid, ++uuid) // create a new UUID by incrementing ours
  this._files[uuid] = newFile
  this._map.set(path, uuid)
}

FileIndex.prototype.removeFile = function (path) {
  var uuid = this._map.get(path)
  this._map.remove(path)
  this._files[uuid].delete()
  delete this._files[uuid]
}

FileIndex.prototype.moveFile = function (oldPath, newPath) {
  var uuid = this._map.get(oldPath)
  this._map.set(newPath, uuid)
  this._map.remove(oldPath)
}

FileIndex.prototype.getFile = function (path) {
  var uuid = this._map.get(path)
  return this._files[uuid]
}

FileIndex.prototype.getFiles = function () {
  return this._map.values().map(function (uuid) {
    return this._files[uuid]
  })
}

FileIndex.prototype.applyOperation = function (operation) {
  if (operation.fileId) {
    this._files[operation.fileId].applyOperation(operation)
  } else {
    this._map.applyOperation(operation)
  }
}

module.exports = FileIndex
