import dotenv from 'dotenv';
dotenv.config();

import * as jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET;
console.log(SECRET)
if (!SECRET) {
  throw new Error('❌ JWT_SECRET is not set in .env');
}

export const signToken = (userId: string): string => {
  console.log('[signToken] signing with secret first 5:', SECRET.slice(0, 5));
  return jwt.sign({ id: userId }, SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): { id: string } => {
  return jwt.verify(token, SECRET) as { id: string };
};