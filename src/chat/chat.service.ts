import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { RoomService } from 'src/room/room/room.service';

@Injectable()
export class ChatService {
  constructor(private roomService: RoomService) {}

  saveMessage(
    clientId: string,
    message: {
      id: string;
      username: string;
      text: string;
      timestamp: number;
    },
  ): { success: boolean; message?: any; roomId?: string } {
    // Validate message
    if (
      !message.text ||
      message.text.length === 0 ||
      message.text.length > 5000
    ) {
      return { success: false };
    }

    // Find room for this client
    const room = this.roomService.findRoomByMember(clientId);

    if (!room) {
      return { success: false };
    }

    // Sanitize message
    const sanitizedMessage = {
      id: message.id || crypto.randomUUID(),
      username: message.username,
      text: message.text.slice(0, 5000),
      timestamp: message.timestamp || Date.now(),
    };

    // Store message
    room.messages.push(sanitizedMessage);

    return {
      success: true,
      message: sanitizedMessage,
      roomId: room.id,
    };
  }

  handleDisconnect(
    clientId: string,
    server: Server,
    specificRoomId?: string,
  ): boolean {
    const room = specificRoomId
      ? this.roomService.getRoomById(specificRoomId)
      : this.roomService.findRoomByMember(clientId);

    if (!room) {
      return false;
    }

    if (room.members.has(clientId)) {
      const username = room.members.get(clientId);
      room.members.delete(clientId);

      console.log(
        `[WebSocket] User ${username} left room ${room.id}. Members: ${room.members.size}`,
      );

      if (room.members.size > 0) {
        server.to(room.id).emit('user_left', {
          username,
          memberCount: room.members.size,
        });
      } else {
        // Delete empty room after 1 hour
        setTimeout(() => {
          if (room.members.size === 0) {
            this.roomService.deleteRoom(room.id);
            console.log('[WebSocket] Room deleted:', room.id);
          }
        }, 3600000);
      }

      return true;
    }

    return false;
  }
}
