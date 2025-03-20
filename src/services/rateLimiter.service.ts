import { Request } from 'express';
import { Redis } from 'ioredis';
import { AppError } from '../utils/appError';

export class RateLimiter {
  private redis: Redis;
  private readonly WINDOW_SIZE_IN_SECONDS = 60;
  private readonly MAX_REQUESTS_PER_WINDOW = 100;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async checkLimit(req: Request): Promise<void> {
    const key = `ratelimit:${req.ip}`;
    
    const requests = await this.redis.incr(key);
    
    if (requests === 1) {
      await this.redis.expire(key, this.WINDOW_SIZE_IN_SECONDS);
    }

    if (requests > this.MAX_REQUESTS_PER_WINDOW) {
      throw new AppError('Too many requests', 429);
    }
  }
}