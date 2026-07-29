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

// Restringe a ação a determinados papéis.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.admin?.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação' });
    }
    next();
  };
}

// Atalho: apenas administradores (ex.: gestão de usuários).
export const requireAdmin = requireRole('admin');
// Gerência de eventos: admin ou organizador.
export const requireEventManager = requireRole('admin', 'organizador');

export function signToken(admin) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, name: admin.name, role: admin.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}
