import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import User from '../models/User';
import { verifyToken } from '../config/jwt';
export interface AuthRequest extends Request {
  user?: any;
}

// In your protect middleware — add temporarily
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyToken(token);  // ✅ same secret guaranteed
    const user    = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err: any) {
    console.error('[protect] error:', err.name, err.message);
    return res.status(401).json({ message: 'Not authorized - invalid token' });
  }
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
      req.user = await User.findById(decoded.id).select('-password');
    } catch { /* ignore */ }
  }
  next();
};