/**
 * Точка входа сервера
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers.js';

const PORT = process.env.PORT ?? 3001;
const app = express();
const httpServer = createServer(app);

app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Poker server running at http://localhost:${PORT}`);
});
