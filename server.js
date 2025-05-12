const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }        // allow any site to connect
});

// serve nothing (we only use socket.io)
app.get('/', (req, res) => res.send('kolam socket.io server'));

// state trackers
let sum = { pot0: 0, pot1: 0, pot2: 0 };
let count = 0;
let votes = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
let toggles = { q: 0, e: 0, t: 0, life: 0 };

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // send existing aggregate if any
  if (count > 0) {
    const aggregate = computeAggregate();
    socket.emit('stateUpdate', { from: null, ...aggregate });
  }

  socket.on('inputUpdate', (data) => {
    console.log(`⬆️ Received inputUpdate from ${socket.id}:`, data);

    // accumulate
    sum.pot0 += data.pot0;
    sum.pot1 += data.pot1;
    sum.pot2 += data.pot2;
    count++;
    votes[data.mode] = (votes[data.mode] || 0) + 1;
    if (data.qMode) toggles.q++;
    if (data.eMode) toggles.e++;
    if (data.tMode) toggles.t++;
    if (data.lifeOn) toggles.life++;

    // compute and broadcast to all (including sender) with origin ID
    const aggregate = computeAggregate();
    console.log(`⬇️ Broadcasting stateUpdate from ${socket.id}:`, aggregate);
    io.emit('stateUpdate', { from: socket.id, ...aggregate });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

/**
 * Computes the current averaged/aggregated state.
 */
function computeAggregate() {
  return {
    pot0: sum.pot0 / count,
    pot1: sum.pot1 / count,
    pot2: sum.pot2 / count,
    mode: Number(Object.entries(votes)
      .sort((a, b) => b[1] - a[1])[0][0]),
    qMode: toggles.q > count / 2,
    eMode: toggles.e > count / 2,
    tMode: toggles.t > count / 2,
    lifeOn: toggles.life > count / 2
  };
}

server.listen(process.env.PORT || 3000, () => {
  console.log('🚀 socket.io server listening on port', server.address().port);
});
