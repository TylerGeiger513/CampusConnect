import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import { createClient } from 'redis';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// connect-redis v6 for CommonJS
const connectRedis = require('connect-redis');
const RedisStore = connectRedis(session);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || '*',
    credentials: true,
  });

  // Create Redis client for storing sessions
  const redisClient = createClient({
    socket: {
      host: configService.get<string>('REDIS_HOST'),
      port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
    },
    password: configService.get<string>('REDIS_PASSWORD'),
  });
  await redisClient.connect();

  // Build the Redis-based session store
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
  });

  // Retrieve SESSION_SECRET and log it
  const sessionSecret = configService.get<string>('SESSION_SECRET');
  if (!sessionSecret) {
    logger.warn(
      'No SESSION_SECRET found in environment. Using fallback secret. This is not secure for production!',
    );
  } else {
    logger.log(`SESSION_SECRET is set to: ${sessionSecret}`);
  }

  // Apply session middleware
  app.use(
    session({
      store: redisStore,
      secret: sessionSecret || 'fallbackSecret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: parseInt(
          configService.get<string>('SESSION_LIFETIME') || '86400000',
          10,
        ),
        httpOnly: true,
        //validate that cookie same site is lax | strict | none
        secure: configService.get<string>('COOKIE_SECURE') === 'true',
        sameSite: configService.get<string>('COOKIE_SAME_SITE') as 'lax' | 'strict' | 'none' || 'lax',
      },
    }),
  );
  // Start the NestJS server
  const port = configService.get<number>('PORT') || 5000;
  await app.listen(port);
  logger.log(`Backend is running on port ${port}`);

  
}

bootstrap();
