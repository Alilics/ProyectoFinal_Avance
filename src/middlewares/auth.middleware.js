const jwt = require('jsonwebtoken');

// middleware que verifica existencia y validez del JWT
const authMiddleware = (req, res, next) => {
  let token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso denegado, token requerido' });
  }

  // aceptar esquema Bearer si viene incluido
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // obj { id, email, role, iat, exp }
    req.usuario = decoded;
    next();
  } catch (error) {
    console.error('authMiddleware error verifying token:', error.message);
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
};

// generador de middleware que exige uno o varios roles
const requireRole = (roles = []) => {
  // roles puede ser string o array
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'Token requerido' });
    }
    if (!roles.includes(req.usuario.role)) {
      return res.status(403).json({ mensaje: 'Permiso insuficiente' });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole
};
