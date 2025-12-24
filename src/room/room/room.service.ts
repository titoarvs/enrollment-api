import { Injectable } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';

interface Room {
  id: string;
  name: string;
  password: string; // hashed
  members: Map<string, string>; // clientId -> username
  messages: Array<{
    id: string;
    username: string;
    text: string;
    timestamp: number;
  }>;
  createdAt: number;
}

interface RoomData {
  id: string;
  name: string;
  members: string[];
  createdAt: number;
}

interface JoinRoomResponse {
  success: boolean;
  message?: string;
  roomData?: RoomData;
  messages?: Array<{
    id: string;
    username: string;
    text: string;
    timestamp: number;
  }>;
  memberCount?: number;
}

@Injectable()
export class RoomService {
  private rooms = new Map<string, Room>();
  private clientToRoom = new Map<string, string>(); // clientId -> roomId

  async joinRoom(
    data: {
      roomId: string;
      username: string;
      password: string;
      isCreator: boolean;
    },
    clientId: string,
  ): Promise<JoinRoomResponse> {
    const { roomId, username, password, isCreator } = data;
    const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

    // Validate input
    if (!roomId || !username || !password) {
      return { success: false, message: 'Invalid room credentials' };
    }

    if (username.length > 50 || username.length < 1) {
      return { success: false, message: 'Username must be 1-50 characters' };
    }

    if (password.length < 4 || password.length > 50) {
      return { success: false, message: 'Password must be 4-50 characters' };
    }

    let room: Room | undefined = this.rooms.get(roomId);

    if (isCreator) {
      if (room) {
        return { success: false, message: 'Room already exists' };
      }

      try {
        const hashedPassword = await bcryptjs.hash(password, SALT_ROUNDS);

        const newRoom: Room = {
          id: roomId,
          name: `Room ${roomId.substring(0, 4)}`,
          password: hashedPassword,
          members: new Map(),
          messages: [],
          createdAt: Date.now(),
        };

        this.rooms.set(roomId, newRoom);
        room = newRoom;
        console.log('[WebSocket] Room created:', roomId);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error('[WebSocket] Error hashing password:', error);
        return { success: false, message: 'Failed to create room' };
      }
    } else {
      // Verify existing room
      if (!room) {
        return { success: false, message: 'Room not found' };
      }

      // Verify password
      try {
        const isValidPassword = await bcryptjs.compare(password, room.password);

        if (!isValidPassword) {
          return { success: false, message: 'Incorrect password' };
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error('[WebSocket] Error comparing password:', error);
        return { success: false, message: 'Authentication failed' };
      }
    }

    // At this point, room is guaranteed to be defined
    if (!room) {
      return { success: false, message: 'Unexpected error: room not found' };
    }

    // Add member to room
    room.members.set(clientId, username);
    this.clientToRoom.set(clientId, roomId);

    // Prepare room data
    const roomData: RoomData = {
      id: room.id,
      name: room.name,
      members: Array.from(room.members.values()),
      createdAt: room.createdAt,
    };

    const response: JoinRoomResponse = {
      success: true,
      roomData,
      messages: room.messages,
      memberCount: room.members.size,
    };

    return response;
  }

  findRoomByMember(clientId: string): Room | undefined {
    const roomId = this.clientToRoom.get(clientId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomInfo(roomId: string): RoomData | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    return {
      id: room.id,
      name: room.name,
      members: Array.from(room.members.values()),
      createdAt: room.createdAt,
    };
  }

  deleteRoom(roomId: string): void {
    // Remove all clients from room mapping
    for (const [clientId, rid] of this.clientToRoom.entries()) {
      if (rid === roomId) {
        this.clientToRoom.delete(clientId);
      }
    }

    this.rooms.delete(roomId);
  }
}
