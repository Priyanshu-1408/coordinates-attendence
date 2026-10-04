import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export async function authenticate(request, response, next) {
  const header = request.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return response.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) return response.status(401).json({ error: 'Invalid or expired token' });
    request.user = user;
    next();
  } catch {
    return response.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
