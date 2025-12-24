// src/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

interface Message {
  user: string;
  text: string;
  timestamp: number;
}

@ApiTags('chat')
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private users: Map<string, string> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const username = this.users.get(client.id);
    this.users.delete(client.id);

    if (username) {
      this.server.emit('userLeft', { username });
      this.server.emit('userCount', this.users.size);
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  @ApiOperation({ summary: 'User joins the chat room' })
  handleJoin(client: Socket, username: string) {
    this.users.set(client.id, username);
    this.server.emit('userJoined', { username });
    this.server.emit('userCount', this.users.size);
  }

  @SubscribeMessage('message')
  @ApiOperation({ summary: 'Send a chat message' })
  handleMessage(client: Socket, payload: Message) {
    this.server.emit('message', payload);
  }

  @SubscribeMessage('typing')
  @ApiOperation({ summary: 'User is typing indicator' })
  handleTyping(client: Socket, username: string) {
    client.broadcast.emit('typing', username);
  }
}
