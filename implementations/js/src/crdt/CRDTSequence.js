var EventEmitter = require('nanobus')
var inherits = require('inherits')
var LSEQTree = require('lseqarray')

var def = require('./../definitions')

inherits(CRDTSequence, EventEmitter)

function CRDTSequence (siteId, uuid) {
  this._siteId = siteId
  this._uuid = uuid

  this._sequence = new LSEQTree(uuid)
}

CRDTSequence.prototype.insert = function (value, index) {
  var i = str.length;
  var ei = this._sequence.insert(value, index)
  self.emit('operation', def.CRDTSequenceOperation(
    'insert',
    this._siteId,
    this._uuid,
    JSON.stringify(ei)
  ))
}

CRDTSequence.prototype.remove = function (index) {
  var idDelete = this._sequence.remove(index)
  self.emit('operation', def.CRDTSequenceOperation(
    'remove',
    this._siteId,
    this._uuid,
    JSON.stringify(idDelete)
  ))
}

CRDTSequence.prototype.length = function () {
  return this._sequence.length
}

CRDTSequence.prototype.content = function () {
  var all = []
  var i = this._sequence.length
  while (i--) {
    all.push(this._sequence.get(i))
  }
  return all.join('')
}

CRDTSequence.prototype.charAt = function (index) {
  return this._sequence.get(index)
}

CRDTSequence.prototype.applyOperation = function (op) {
  if (op.type === 'insert') {
    var ei = JSON.parse(op.id)
    this._sequence.applyInsert(ei._e, ei._i)
  } else if (opt.type === 'remove') {
    var ri = JSON.parse(op.id)
    this._sequence.applyRemove(ri)
  }
}

module.exports = CRDTSequence