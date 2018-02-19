var EventEmitter = require('nanobus')
var inherits = require('inherits')
var OrMap = require('observed-remove-map')

var def = require('./../definitions')

inherits(CRDTMap, EventEmitter)

function CRDTMap (uuid) {
  EventEmitter.call(this)

  this._map = new OrMap(uuid)

  this._map.on('set', (key, value) => {
    this.emit('set', new def.CRDTMapSetEvent(key, value))
  })
  this._map.on('delete', (key, value) => {
    this.emit('remove', new def.CRDTMapRemoveEvent(key, value))
  })
  this._map.on('op', (op) => {
    // normalize OrMap's operation object
    var type = op[0] === 'delete' ? 'remove' : 'insert'
    this.emit('operation', new def.CRDTMapOperation(
      type,     // 'remove' or 'insert'
      uuid,     // our peerId
      op[2][0], // counter
      op[1]     // element
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

CRDTMap.prototype.keys = function () {
  return this._map.keys()
}

CRDTMap.prototype.values = function () {
  return this._map.values()
}

CRDTMap.prototype.applyOperation = function (op) {
  // put it into OrMap's form
  var type = op.type === 'remove' ? 'delete' : 'add'
  var fixedOp = [
    type,
    op.element,
    [op.counter, op.peerId]
  ]
  this._map.receive(fixedOp)
}

module.exports = CRDTMap
