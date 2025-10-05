// @ts-nocheck
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Middleware factory that depends on db and JWT secret
module.exports = function createAuthMiddlewares(db, jwtSecret) {
  if (!db) throw new Error('Middleware init error: db is required');
  if (!jwtSecret) throw new Error('Middleware init error: jwtSecret is required');

  const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token requis.' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant.' });

    try {
      const decoded = jwt.verify(token, jwtSecret);
      const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');
      const revoked = await db.collection('token_blacklist').findOne({ jti });
      if (revoked) {
        return res.status(401).json({ error: 'Non autorise' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide.' });
    }
  };

  const agentMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'agent') {
      return res.status(403).json({ error: 'Accès réservé aux agents.' });
    }
    next();
  };

  return { authMiddleware, agentMiddleware };
}
