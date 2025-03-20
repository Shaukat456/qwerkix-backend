import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/appError';

// Rate limiting configuration
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// SQL Injection prevention
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any) => {
    for (let prop in obj) {
      if (typeof obj[prop] === 'string') {
        // Remove SQL injection patterns
        obj[prop] = obj[prop].replace(/['";\\]/g, '');
      } else if (typeof obj[prop] === 'object') {
        sanitize(obj[prop]);
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);

  next();
};

// XSS Prevention
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeHtml = (str: string): string => {
    return str.replace(/<[^>]*>/g, '');
  };

  const sanitizeObj = (obj: any) => {
    for (let prop in obj) {
      if (typeof obj[prop] === 'string') {
        obj[prop] = sanitizeHtml(obj[prop]);
      } else if (typeof obj[prop] === 'object') {
        sanitizeObj(obj[prop]);
      }
    }
  };

  sanitizeObj(req.body);
  next();
};

// CSRF Protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-csrf-token'];
  if (!token || token !== req.session?.csrfToken) {
    throw new AppError('Invalid CSRF token', 403);
  }
  next();
};

// Security Headers
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Frame Options
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  next();
};