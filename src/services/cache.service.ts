import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class Cache {
  private client: Redis;
  private readonly ttl: number = 3600; // 1 hour default TTL

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (error) => {
      logger.error('Redis Cache Error:', error);
    });
  }

  async get(key: string): Promise<any> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.ttl): Promise<void> {
    try {
      await this.client.set(
        key,
        JSON.stringify(value),
        'EX',
        ttl
      );
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushall();
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }
}