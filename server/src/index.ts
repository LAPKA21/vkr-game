/**
 * Точка входа сервера
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerSocketHandlers } from './socket/handlers.js';
import cors from 'cors';
import authRoutes from './application/authRoutes.js';

const PORT = process.env.PORT ?? 3001;
const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use('/api/auth', authRoutes);

const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Poker server running at http://localhost:${PORT}`);
});

