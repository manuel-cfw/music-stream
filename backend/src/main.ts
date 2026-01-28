import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  // CORS configuration - support multiple origins
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowedOrigins: string[] = [];

  // Add localhost origins only in development mode
  if (isDevelopment) {
    allowedOrigins.push('http://localhost:5173'); // Vite default dev server
    allowedOrigins.push('http://localhost'); // Common development URL
  }

  // Add APP_URL if specified and not already in the list
  const appUrl = process.env.APP_URL;
  if (appUrl && !allowedOrigins.includes(appUrl)) {
    allowedOrigins.push(appUrl);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // In development, allow requests with no origin (like curl or Postman)
      if (isDevelopment && !origin) {
        callback(null, true);
        return;
      }
      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Unified Playlist Manager API')
    .setDescription('API for managing unified playlists across Spotify and SoundCloud')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('providers', 'Music provider connections')
    .addTag('playlists', 'Provider playlist management')
    .addTag('unified', 'Unified playlist management')
    .addTag('sync', 'Sync operations')
    .addTag('search', 'Search functionality')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
