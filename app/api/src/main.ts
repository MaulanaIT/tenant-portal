import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApp(app);

  const port = config.get<string>('API_PORT') ?? config.get<string>('PORT') ?? 3000;
  const host = config.get<string>('API_HOST');
  await (host ? app.listen(port, host) : app.listen(port));
}
await bootstrap();
