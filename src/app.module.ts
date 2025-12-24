import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatGateway } from './chat/chat.gateway';
import { ConfigModule } from './config/config/config.module';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}
