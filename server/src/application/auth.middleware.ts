import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Нет токена авторизации' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Неверный формат токена' });
  }

  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'super-secret-jwt-key-replace-me-in-production'
    ) as { userId: string; email: string };
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verify error:', error);
    return res.status(401).json({ error: 'Токен недействителен или истек срок действия' });
  }
};
