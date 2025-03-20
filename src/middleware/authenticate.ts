import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    
    // In a real application, you would verify the JWT token here
    // For demo purposes, we'll just check if the user exists
    const userId = token; // In reality, this would come from JWT verification
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(error);
  }
};