var WireProtocol = require('wire-protocol')
var Duplex = require('readable-stream').Duplex
var inherits = require('inherits')
var Buffer = require('safe-buffer').Buffer

var protocol = [
  {
    name: 'InitMessage',
    first: true,
    length: 36,
    done: function (data, next) {
      next('SupportMessagePrefix')
    }
  }, {
    name: 'SupportMessagePrefix',
    length: 2,
    done: function (data, next) {
      next('SupportMessage', data.readUInt16BE(0))
    }
  }, {
    name: 'SupportMessage',
    done: function (data, next) {
      next('HeaderMessage')
    }
  }, {
    name: 'HeaderMessage',
    length: 1,
    deserialize: function (buffer) {
      return buffer.readUInt8(0)
    },
    done: function (type, next) {
      switch (type) {
        case 0:
          next('CRDTOperationMessagePrefix')
          break
        case 1:
          next('FileIdentiferMessage')
          break
        case 2:
          next('FileIdentiferMessage')
          break
        default:
          throw new Error('Unknown operation type.')
      }
    }
  },
  {
    name: 'FileIdentiferMessage',
    length: 32,
    done: function (data, next) {
      next('CRDTOperationMessagePrefix')
    }
  },
  {
    name: 'CRDTOperationMessagePrefix',
    length: 2,
    done: function (data, next) {
      next('CRDTOperationMessage', data.readUInt16BE(0))
    }
  },
  {
    name: 'CRDTOperationMessage',
    done: function (data, next) {
      next('HeaderMessage')
    }
  },
  {
    name: 'CursorMessage',
    length: 4,
    done: function (data, next) {
      next('HeaderMessage')
    }
  }
]

inherits(Protocol, Duplex)

function Protocol (opts) {
  Duplex.call(this, null)

  var uuid = opts.uuid
  var supports = opts.supports

  this._serialize = JSON.stringify
  this._deserialize = JSON.parse

  this._wire = new WireProtocol(protocol)

  this._wire.on('data', (chunk) => {
    this.push(chunk)
  })

  this._remotePeerId = null
  this._currentFile = null
  this._currentDataType = null

  this._wire.on('InitMessage', (buffer) => {
    this._remotePeerId = buffer.slice(4).toString('utf-8')
  })
  this._wire.on('HeaderMessage', (type) => {
    this._currentDataType = type
  })
  this._wire.on('FileIdentiferMessage', (buffer) => {
    this._currentFile = buffer.toString('utf-8')
  })
  this._wire.on('CRDTOperationMessage', (buffer) => {
    var op = this._deserialize(buffer.slice(3).toString('utf-8'))

    // add previously received operation data back into the object
    op.fileId = this._currentFile
    op.peerId = this._remotePeerId

    this.emit('operation', op)
  })

  // InitMessage
  var initMessage = Buffer.alloc(36)
  initMessage.writeUInt32BE(0, 0)
  initMessage.write(Buffer.from(uuid, 'utf-8'), 4)
  this._wire.send('InitMessage', initMessage)

  // SupportMessage and SupportMessagePrefix
  var supportMessage = Buffer.alloc(4 * supports.length)
  supports.forEach((el, i) => {
    supportMessage.writeUInt32BE(el, i * 4)
  })
  var prefix = Buffer.alloc(2)
  prefix.writeUInt16BE(supportMessage.length, 0)
  this._wire.send('SupportMessagePrefix', supportMessage.length)
  this._wire.send('SupportMessage', supportMessage)
}

Protocol.prototype._write = function (chunk, enc, next) {
  this._wire.write(chunk, enc, next)
}
Protocol.prototype._read = function () { }

Protocol.prototype.CRDTSequenceOperation = function (fileId, operations) {
  // HeaderMessage
  var header = Buffer.alloc(1)
  header.writeUInt8(1)
  this._wire.send('HeaderMessage', header)

  this._CRDTOperation(fileId, operations)
}

Protocol.prototype.CRDTSetOperation = function (fileId, operations) {
  // HeaderMessage
  var header = Buffer.alloc(1)
  header.writeUInt8(0)
  this._wire.send('HeaderMessage', header)

  this._CRDTOperation(fileId, operations)
}

Protocol.prototype._CRDTOperation = function (fileId, operations) {
  // Strip out the excess operation data
  operations.forEach(op => {
    delete op['peerId']
    delete op['fileId']
  })

  // FileIdentiferMessage
  this._wire.send('FileIdentiferMessage', Buffer.from(fileId, 'utf-8'))

  // CRDTOperationMessage and CRDTOperationMessagePrefix
  var serializedOperations = operations.map((op, i) => {
    return Buffer.from(this._serialize(op), 'utf-8')
  })

  serializedOperations.forEach((op, i) => {
    var prefix = Buffer.alloc(2)
    prefix.writeUInt16BE(3 + op.length, 0)

    var buffer = Buffer.alloc(3 + op.length)
    buffer.writeUInt8(i === serializedOperations.length ? 1 : 0) // Is last operation? 0=false, 1=true
    buffer.writeUInt8(operations[i].type === 'add' ? 1 : 0, 1) // 0=remove, 1=add
    buffer.writeUInt8(0, 2) // JSON
    buffer.write(op, 3)

    this._wire.send('CRDTOperationMessagePrefix', prefix)
    this._wire.send('CRDTOperationMessag', buffer)
  })
}

module.exports = Protocol
