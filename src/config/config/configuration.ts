// src/config/configuration.ts
export const configuration = () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  socketio: {
    path: process.env.SOCKET_IO_PATH || '/socket.io',
    pingTimeout: parseInt(process.env.SOCKET_IO_PING_TIMEOUT, 10) || 60000,
    pingInterval: parseInt(process.env.SOCKET_IO_PING_INTERVAL, 10) || 25000,
  },
  swagger: {
    title: process.env.SWAGGER_TITLE || 'Chat API',
    description:
      process.env.SWAGGER_DESCRIPTION || 'Real-time chat application API',
    version: process.env.SWAGGER_VERSION || '1.0',
  },
});
