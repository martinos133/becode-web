// Načítaj env v poradí: apps/api, potom apps/.env (spoločný zdroj)
const path = require('path');
const apiDir = path.join(__dirname, '..');       // apps/api
const appsDir = path.join(__dirname, '..', '..'); // apps
require('dotenv').config({ path: path.join(apiDir, '.env') });
require('dotenv').config({ path: path.join(apiDir, '.env.local') });
require('dotenv').config({ path: path.join(appsDir, '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isDev = env.nodeEnv !== 'production';
  app.enableCors({
    origin: isDev ? true : env.corsOrigins,
    credentials: true,
  });
  const port = env.port;
  await app.listen(port);
  console.log(`API beží na http://localhost:${port}`);
}
bootstrap();
