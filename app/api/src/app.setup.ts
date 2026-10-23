import {
  BadRequestException,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function configureApp(app: INestApplication) {
  const portalUrl = app.get(ConfigService).get<string>('PORTAL_URL');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          code: 'VALIDATION_FAILED',
          message: errors.flatMap((e) => Object.values(e.constraints ?? {})),
        }),
    }),
  );
  app.enableCors({ origin: portalUrl ? [portalUrl] : false });
  return app;
}
