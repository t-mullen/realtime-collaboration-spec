var EventEmitter = require('nanobus')
var inherits = require('inherits')
var OrMap = require('observe-removed-map')

var def = require('./../definitions')

inherits(CRDTMap, EventEmitter)

function CRDTMap (uuid) {
  this._map = new OrMap(uuid)

  this._map.on('set', function (key, value) {
    self.emit('set', new def.CRDTMapSetEvent(key, value))
  })
  this._map.on('delete', function (key, value) {
    self.emit('remove', new def.CRDTMapRemoveEvent(key, value))
  })
  this._map.on('op', function (op) {
    // normalize OrMap's operation
    var type = op[0] === 'delete' ? 'remove' : 'add'
    self.emit('operation', new def.CRDTMapOperation(
      type,
      uuid,
      op[2][0],
      op[1]
    ))
  })
}

CRDTMap.prototype.set = function (key, value) {
  this._map.set(key, value)
}

CRDTMap.prototype.remove = function (key) {
  this._map.delete(key)
}

CRDTMap.prototype.get = function (key) {
  return this._map.get(key)
}

CRDTMap.prototype.contains = function (key) {
  return !!this._map.get(key)
}

CRDTMap.prototype.length = function () {
  return this._map.keys().length
}

CRDTMap.prototype.keys = function () {
  return this._map.keys()
}

CRDTMap.prototype.values = function () {
  return this._map.values()
}

CRDTMap.prototype.applyOperation = function (op) {
  // put it into OrMap's form
  this._map.receive([
    op.type,
    op.element,
    [opt.counter, op.peerId]
  ])
}

module.exports = CRDTMap