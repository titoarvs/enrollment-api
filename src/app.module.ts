import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGateway } from './chat/chat.gateway';
import { ConfigModule } from './config/config/config.module';
import { ChatService } from './chat/chat.service';
import { RoomService } from './room/room/room.service';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
  providers: [AppService, ChatGateway, ChatService, RoomService],
})
export class AppModule {}
