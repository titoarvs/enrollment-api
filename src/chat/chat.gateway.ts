import {
  WebSocketGateway,
  SubscribeMessage,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { RoomService } from 'src/room/room/room.service';

@WebSocketGateway({
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private roomService: RoomService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`[WebSocket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WebSocket] Client disconnected: ${client.id}`);
    this.chatService.handleDisconnect(client.id, this.server);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    client: Socket,
    data: {
      roomId: string;
      username: string;
      password: string;
      isCreator: boolean;
    },
  ) {
    try {
      const result = await this.roomService.joinRoom(data, client.id);

      if (!result.success) {
        client.emit('auth_error', result.message);
        return;
      }

      // Join socket to room
      client.join(data.roomId);

      // Send room data
      client.emit('room_joined', result.roomData);
      client.emit('message_history', result.messages);

      // Notify others
      this.server.to(data.roomId).emit('user_joined', {
        username: data.username,
        memberCount: result.memberCount,
      });

      console.log(
        `[WebSocket] User ${data.username} joined room ${data.roomId}`,
      );
    } catch (error) {
      console.error('[WebSocket] Join room error:', error);
      client.emit('auth_error', 'Server error');
    }
  }

  @SubscribeMessage('send_message')
  handleSendMessage(
    client: Socket,
    message: {
      id: string;
      username: string;
      text: string;
      timestamp: number;
    },
  ) {
    try {
      const result = this.chatService.saveMessage(client.id, message);

      if (!result.success) {
        return;
      }

      // Broadcast to room
      this.server.to(result.roomId).emit('receive_message', result.message);
      console.log(
        `[WebSocket] Message in room ${result.roomId} from ${message.username}`,
      );
    } catch (error) {
      console.error('[WebSocket] Send message error:', error);
    }
  }

  @SubscribeMessage('get_room_info')
  handleGetRoomInfo(client: Socket, roomId: string) {
    try {
      const roomInfo = this.roomService.getRoomInfo(roomId);

      if (!roomInfo) {
        client.emit('room_error', 'Room not found');
        return;
      }

      client.emit('room_info', roomInfo);
    } catch (error) {
      console.error('[WebSocket] Get room info error:', error);
      client.emit('room_error', 'Server error');
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(client: Socket, roomId: string) {
    try {
      const result = this.chatService.handleDisconnect(
        client.id,
        this.server,
        roomId,
      );

      if (result) {
        client.leave(roomId);
        client.emit('room_left', { roomId });
      }
    } catch (error) {
      console.error('[WebSocket] Leave room error:', error);
    }
  }
}
