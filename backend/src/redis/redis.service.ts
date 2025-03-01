import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { URL } from 'url';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    let redisPortStr = this.configService.get<string>('REDIS_PORT') || "6379";
    
    // If REDIS_PORT is provided as a connection string, extract the port.
    if (redisPortStr.startsWith('tcp://') || redisPortStr.startsWith('redis://')) {
      try {
        const parsed = new URL(redisPortStr.replace('tcp://', 'http://'));
        redisPortStr = parsed.port;
      } catch (err) {
        this.logger.error(`Failed to parse REDIS_PORT URL: ${redisPortStr}`);
        process.exit(1);
      }
    }
    const redisPort = parseInt(redisPortStr, 10);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.logger.log(`REDIS_HOST: ${redisHost}`);
    this.logger.log(`REDIS_PORT: ${redisPortStr} parsed as ${redisPort}`);
    this.logger.log(`REDIS_PASSWORD: ${redisPassword ? '****' : 'not set'}`);

    if (isNaN(redisPort)) {
      this.logger.error(`Invalid REDIS_PORT value: ${redisPortStr}`);
      process.exit(1);
    }
    
    this.client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
      password: redisPassword,
    });
    
    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error: ' + err.message);
    });
    
    await this.client.connect();
    this.logger.log('Connected to Redis successfully');
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
      this.logger.log('Redis client disconnected');
    }
  }
}
