import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

const adapter = new ExpressAdapter();
const app = await NestFactory.create(AppModule, adapter);
configureApp(app);

if (process.env.VERCEL) {
  await app.init();
} else {
  const config = app.get(ConfigService);
  const port =
    config.get<string>('API_PORT') ?? config.get<string>('PORT') ?? 3000;
  const host = config.get<string>('API_HOST');
  await (host ? app.listen(port, host) : app.listen(port));
}

export default adapter.getInstance();
