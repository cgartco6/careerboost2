import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

class RateLimiter {
  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Configure default rate limit windows
    this.windows = {
      short: 15 * 60 * 1000, // 15 minutes
      medium: 60 * 60 * 1000, // 1 hour
      long: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  // General API rate limiter
  getAPILimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl_api:'
      }),
      windowMs: this.windows.short,
      max: 100, // Limit each IP to 100 requests per window
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP address. Please try again later.',
          retryAfter: Math.ceil(this.windows.short / 1000)
        });
      }
    });
  }

  // Strict rate limiter for sensitive endpoints
  getStrictLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl_strict:'
      }),
      windowMs: this.windows.short,
      max: 10, // Very strict limit for sensitive operations
      message: {
        error: 'Too many attempts. Please wait before trying again.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Auth-specific rate limiter
  getAuthLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl_auth:'
      }),
      windowMs: this.windows.medium,
      max: 5, // Limit login attempts
      message: {
        error: 'Too many login attempts. Please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true // Don't count successful logins
    });
  }

  // File upload rate limiter
  getUploadLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl_upload:'
      }),
      windowMs: this.windows.long,
      max: 10, // Limit file uploads per day
      message: {
        error: 'Upload limit exceeded. Please try again tomorrow.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Payment endpoint rate limiter
  getPaymentLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl_payment:'
      }),
      windowMs: this.windows.short,
      max: 5, // Limit payment attempts
      message: {
        error: 'Too many payment attempts. Please contact support if you need help.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Job scraping rate limiter
  getScrapingLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl_scraping:'
      }),
      windowMs: this.windows.medium,
      max: 20, // Limit job scraping requests
      message: {
        error: 'Job search limit exceeded. Please wait before searching again.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Admin endpoint rate limiter
  getAdminLimiter() {
    return rateLimit({
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl_admin:'
      }),
      windowMs: this.windows.short,
      max: 50, // Higher limit for admin operations
      message: {
        error: 'Admin API rate limit exceeded.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  // Dynamic rate limiter for custom needs
  createDynamicLimiter(options) {
    const defaultOptions = {
      store: new RedisStore({
        client: this.redisClient,
        prefix: 'rl_dynamic:'
      }),
      windowMs: this.windows.short,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false
    };

    return rateLimit({
      ...defaultOptions,
      ...options
    });
  }

  // Get current rate limit info for a key
  async getRateLimitInfo(key) {
    try {
      const stored = await this.redisClient.get(key);
      if (!stored) return null;

      const data = JSON.parse(stored);
      return {
        current: data.totalHits,
        resetTime: new Date(data.resetTime),
        remaining: Math.max(0, data.max - data.totalHits)
      };
    } catch (error) {
      console.error('Error getting rate limit info:', error);
      return null;
    }
  }

  // Reset rate limit for a specific key
  async resetRateLimit(key) {
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Error resetting rate limit:', error);
      return false;
    }
  }

  // Clean up expired rate limit records
  async cleanupExpired() {
    // Redis store automatically handles expiration
    return true;
  }
}

// Create and export singleton instance
const rateLimiter = new RateLimiter();
export default rateLimiter;
