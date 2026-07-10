import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Restringe a ação a administradores. 'viewer' só consulta (GETs de leitura).
export function requireAdmin(req, res, next) {
  if (req.admin?.role !== 'admin') {
    return res.status(403).json({ error: 'Ação restrita a administradores' });
  }
  next();
}

export function signToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, name: admin.name, role: admin.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}
