var test = require('tape')
var tapSpec = require('tap-spec');
test.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);

var CRDTSequence = require('../../src/crdt/CRDTSequence')

function compareSeqs(t, seq1, seq2) {
  t.deepEqual(seq1.content(), seq2.content(), 'content is equal')
}

test('initially empty', function (t) {
  var seq1 = new CRDTSequence('site1')
  var seq2 = new CRDTSequence('site2')

  compareSeqs(t, seq1, seq2)
  t.equal(seq1.content(), '', 'initial value is empty')
  t.equal(seq2.content(), '', 'initial value is empty')

  t.end()
})

test('concurrent insert', function (t) {
  var seq1 = new CRDTSequence('site1')
  var seq2 = new CRDTSequence('site2')

  seq1.on('operation', (op) => setTimeout(() => {seq2.applyOperation(op); check()}, 100))
  seq2.on('operation', (op) => setTimeout(() => {seq1.applyOperation(op); check()}, 100))

  seq1.insert(0, 'a')
  seq2.insert(0, 'b')

  var waiting = 2
  function check () {
    waiting--
    if (waiting === 0) {
      compareSeqs(t, seq1, seq2)
      t.end()
    }
  }
})

test('concurrent insert/remove', function (t) {
  var seq1 = new CRDTSequence('site1')
  var seq2 = new CRDTSequence('site2')

  // fifo queue to ensure in-order delivery
  var queue1 = []
  var queue2 = []

  var waiting = 0

  seq1.on('operation', (op) => {
    waiting++
    queue2.push(op)
    setTimeout(() => {
      seq2.applyOperation(queue2.shift())
      waiting--
      checkWaiting()
    }, 100)
  })
  seq2.on('operation', (op) => {
    waiting++
    queue1.push(op)
    setTimeout(() => {
      seq1.applyOperation(queue1.shift())
      waiting--
      checkWaiting()
    }, 100)
  })

  seq1.insert(0, 'a')
  seq2.remove(0)

  seq1.remove(0)
  seq2.insert(0, 'b')

  function checkWaiting () {
    if (waiting === 0) {
      compareSeqs(t, seq1, seq2)
      t.end()
    }
  }
})

test('concurrent remove', function (t) {
  var seq1 = new CRDTSequence('site1')
  var seq2 = new CRDTSequence('site2')

  seq1.once('operation', (op) => seq2.applyOperation(op))
  seq1.insert(0, 'a')

  seq1.on('operation', (op) => setTimeout(() => seq2.applyOperation(op), 100))
  seq2.on('operation', (op) => setTimeout(() => seq1.applyOperation(op), 100))

  seq1.remove(0)
  seq2.remove(0)

  setTimeout(() => {
    compareSeqs(t, seq1, seq2)
    t.equal(seq1.content(), '', 'content is empty')
    t.end()
  }, 200)
})

test('probabilistic stress test', function (t) {
  var numPeers = 50
  var numOperations = 50
  var seqs = {}
  var waiting = 0
  var queues = {}
  var numDel = {}

  function checkWaiting() {
    if (waiting === 0) {
      for (var i=0; i<(numPeers - 1); i++) {
        compareSeqs(t, seqs[i], seqs[i+1])
      }
      t.end()
    }
  }

  // construct peers
  for (var i = 0; i < numPeers; i++) {
    seqs[i] = new CRDTSequence(i + '')
    numDel[i] = 0
    seqs[i].on('operation', (op) => {
      // distribute operation to other peers
      for (var i2 = 0; i2 < numPeers; i2++) {
        if (i === i2) continue
        queues[i2] = queues[i2] || []
        queues[i2].push(op)
        ;(function (i2) {
          waiting++
          setTimeout(() => {
            seqs[i2].applyOperation(queues[i2].shift())
            numDel[i2]++
            waiting--
            checkWaiting()
          }, Math.random() + 1)
        }(i2))
      }
    })
  }

  // initiate operations
  for (var i = 0; i < numPeers; i++) {
    for (var i2 = 0; i2 < numOperations; i2++) {
      var method = i === 0 ? 'insert' : ['insert', 'remove'][Math.floor(Math.random() * 2)]
      var index = Math.floor(Math.random() * seqs[i].length())
      var value = Math.random() + ''
      seqs[i][method](index, value)
    }
  }
})