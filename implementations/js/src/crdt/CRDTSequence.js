var EventEmitter = require('nanobus')
var inherits = require('inherits')
var LSEQTree = require('lseqarray')

var def = require('./../definitions')

inherits(CRDTSequence, EventEmitter)

function CRDTSequence (siteId, uuid) {
  EventEmitter.call(this)

  this._siteId = siteId
  this._uuid = uuid

  this._sequence = new LSEQTree(siteId)
}

CRDTSequence.prototype.insert = function (index, value) {
  var ei = this._sequence.insert(value, index)

  // Normalize lseqarray's operation object
  this.emit('operation', new def.CRDTSequenceOperation(
    'insert',
    this._siteId,
    this._uuid,
    JSON.stringify(ei)
  ))
}

CRDTSequence.prototype.remove = function (index) {
  if (index >= this._sequence.length) return // protect the end node
  var idDelete = this._sequence.remove(index) // don't delete the leaf node

   // Normalize lseqarray's operation object
  this.emit('operation', new def.CRDTSequenceOperation(
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
  if (i > 0) {
    while (i--) {
      all.push(this.charAt(i))
    }
  }
  return all.join('')
}

CRDTSequence.prototype.charAt = function (index) {
  var element = this._sequence.get(index)
  return element ? element._e : null
}

CRDTSequence.prototype.applyOperation = function (op) {
  if (op.fileId !== this._uuid) {
    throw new Error('UUID mismatch!')
  }
  if (op.type === 'insert') {
    var ei = JSON.parse(op.id)
    this._sequence.applyInsert(ei._e, ei._i)
  } else if (op.type === 'remove') {
    var ri = JSON.parse(op.id)
    this._sequence.applyRemove(ri)
  }
}

module.exports = CRDTSequence
