import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { SupabaseApiAuthGuard } from './auth/guards/supabase-api-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '.env'),
        join(__dirname, '..', '.env.local'),
        join(__dirname, '..', '..', '.env'),
        '.env',
        '.env.local',
      ],
    }),
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SupabaseApiAuthGuard,
    },
  ],
})
export class AppModule {}
