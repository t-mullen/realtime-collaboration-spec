var test = require('tape')
var tapSpec = require('tap-spec');
test.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);

var CRDTMap = require('../../src/crdt/CRDTMap')

function compareMaps(t, map1, map2) {
  t.deepEqual(map1.keys().sort(), map2.keys().sort(), 'map keys are equal')
  t.deepEqual(map1.values().sort(), map2.values().sort(), 'map values are equal')
}

test('concurrent set', function (t) {
  var map1 = new CRDTMap('site1')
  var map2 = new CRDTMap('site2')

  compareMaps(t, map1, map2)
  t.equal(map1.get('/folder/file.js'), null, 'initial map value is null')
  t.equal(map2.get('/folder/file.js'), null, 'initial map value is null')

  map1.on('operation', (op) => setTimeout(() => map2.applyOperation(op), 100))
  map2.on('operation', (op) => setTimeout(() => map1.applyOperation(op), 100))

  map1.set('/folder/file.js', '1')
  map2.set('/folder/file.js', '2')

  setTimeout(() => {
    compareMaps(t, map1, map2)
    t.equal(map1.get('/folder/file.js'), '2', 'eventual map values are consistent')
    t.equal(map2.get('/folder/file.js'), '2', 'eventual map values are consistent')
    t.end()
  }, 200)
})

test('concurrent remove', function (t) {
  var map1 = new CRDTMap('site1')
  var map2 = new CRDTMap('site2')

  compareMaps(t, map1, map2)
  t.equal(map1.get('/folder/file.js'), null, 'initial map value is null')
  t.equal(map2.get('/folder/file.js'), null, 'initial map value is null')

  map1.once('operation', (op) => map2.applyOperation(op))
  map2.once('operation', (op) => map1.applyOperation(op))

  map1.set('/folder/file.js', '1')
  map2.set('/folder/file.js', '2')

  map1.on('operation', (op) => setTimeout(() => map2.applyOperation(op), 100))
  map2.on('operation', (op) => setTimeout(() => map1.applyOperation(op), 100))

  map1.remove('/folder/file.js')
  map2.remove('/folder/file.js')

  setTimeout(() => {
    compareMaps(t, map1, map2)
    t.equal(map1.get('/folder/file.js'), null, 'eventual map values are consistent')
    t.equal(map2.get('/folder/file.js'), null, 'eventual map values are consistent')
    t.end()
  }, 200)
})

test('concurrent remove/set', function (t) {
  var map1 = new CRDTMap('site1')
  var map2 = new CRDTMap('site2')

  compareMaps(t, map1, map2)
  t.equal(map1.get('/folder/file.js'), null, 'initial map value is null')
  t.equal(map2.get('/folder/file.js'), null, 'initial map value is null')

  map1.once('operation', (op) => map2.applyOperation(op), 100)
  map2.once('operation', (op) => map1.applyOperation(op), 100)

  map1.set('/folder/file.js', '1')

  map1.on('operation', (op) => setTimeout(() => map2.applyOperation(op), 100))
  map2.on('operation', (op) => setTimeout(() => map1.applyOperation(op), 100))

  map2.remove('/folder/file.js')
  map1.set('/folder/file.js', 'x')

  setTimeout(() => {
    compareMaps(t, map1, map2)
    t.equal(map1.get('/folder/file.js'), 'x', 'eventual map values are consistent')
    t.equal(map2.get('/folder/file.js'), 'x', 'eventual map values are consistent')
    t.end()
  }, 200)
})

test('probabilistic stress test', function (t) {
  var numPeers = 50
  var numOperations = 50
  var maps = {}
  var waiting = 0
  var queues = {}
  var keys = []

  function checkWaiting() {
    if (waiting === 0) {
      for (var i=0; i<(numPeers - 1); i++) {
        compareMaps(t, maps[i], maps[i+1])
      }
      t.end()
    }
  }

  // construct peers
  for (var i = 0; i < numPeers; i++) {
    maps[i] = new CRDTMap(i + '')
    maps[i].on('operation', (op) => {
      // distribute operation to other peers
      for (var i2 = 0; i2 < numPeers; i2++) {
        if (i === i2) continue
        queues[i2] = queues[i2] || []
        queues[i2].push(op)
        waiting++
        ;(function (i2) {
          setTimeout(() => {
            maps[i2].applyOperation(queues[i2].shift())
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
      var method = ['set', 'remove'][Math.floor(Math.random() * 2)]
      var isNewKey = !!Math.floor(Math.random() * 2)
      var key = isNewKey && keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : Math.random()
      keys.push(key)
      maps[i][method](key, Math.random())
    }
  }
})