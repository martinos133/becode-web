import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: env.corsOrigin,
    credentials: true,
  });
  const port = env.port;
  await app.listen(port);
  console.log(`API beží na http://localhost:${port}`);
}
bootstrap();
