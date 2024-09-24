const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Setup server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const sessions = {};

app.use(express.static('public'));

// Route to create a session
app.get('/create-session', (req, res) => {
    const sessionId = uuidv4();
    sessions[sessionId] = { players: [], host: null };
    res.json({ sessionId });
});

io.on('connection', (socket) => {
  socket.on('join', ({ sessionId, username }) => {
      if (!sessions[sessionId]) {
          sessions[sessionId] = { players: [], host: socket.id };
      }

      const session = sessions[sessionId];
      const player = { id: socket.id, username, estimate: null };

      if (!session.host) {
          session.host = socket.id;
          io.to(socket.id).emit('host');
      }

      session.players.push(player);
      socket.join(sessionId);
      io.to(sessionId).emit('players', session.players);
  });

  socket.on('estimate', ({ sessionId, username, estimate }) => {
      const session = sessions[sessionId];
      const player = session.players.find(p => p.username === username);
      if (player) {
          player.estimate = estimate;
      }

      io.to(sessionId).emit('players', session.players); // Send players data to everyone but keep estimates hidden
  });

  socket.on('showVotes', (sessionId) => {
      const session = sessions[sessionId];
      io.to(sessionId).emit('results', session.players); // Send all players with revealed votes
  });

  socket.on('clearVotes', (sessionId) => {
    const session = sessions[sessionId];
    if (session) {
        session.players.forEach(player => player.estimate = null);  // Reset all player votes to null
    }

    // Broadcast the updated player list (with cleared votes) to all players
    io.to(sessionId).emit('clearVotes', session.players);
});


  socket.on('disconnect', () => {
      Object.keys(sessions).forEach(sessionId => {
          const session = sessions[sessionId];
          const index = session.players.findIndex(p => p.id === socket.id);
          if (index !== -1) session.players.splice(index, 1);

          if (session.host === socket.id) {
              delete sessions[sessionId];
          } else {
              io.to(sessionId).emit('players', session.players);
          }
      });
  });
});


server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
