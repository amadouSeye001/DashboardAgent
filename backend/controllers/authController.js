// @ts-nocheck
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const { comparePassword } = require('../utils/hash');

module.exports = function createAuthController(db, jwtSecret) {
  if (!db) throw new Error('authController init error: db is required');
  if (!jwtSecret) throw new Error('authController init error: jwtSecret is required');

  const connexion = async (req, res) => {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    try {
      const user = await db.collection('users').findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Email ou mot de passe invalide.' });
      }

      if (user.bloquer) {
        return res.status(403).json({ message: 'Votre compte est bloqué.' });
      }

      const isMatch = await comparePassword(motDePasse, user.motDePasse);
      if (!isMatch) {
        return res.status(400).json({ message: 'Email ou mot de passe invalide.' });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: '1h', jwtid: new ObjectId().toString() }
      );

      const userSansMdp = { ...user, motDePasse: undefined };
      return res.json({ message: 'Connexion réussie', token, user: userSansMdp });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  const agentLogout = async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) return res.status(400).json({ error: 'Token manquant.' });

      const decoded = req.user;
      const jti = decoded.jti || crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 60 * 60 * 1000);

      await db.collection('token_blacklist').updateOne(
        { jti },
        {
          $set: {
            jti,
            userId: decoded.id ? new ObjectId(decoded.id) : null,
            role: decoded.role || null,
            createdAt: new Date(),
            expiresAt,
          },
        },
        { upsert: true }
      );

      return res.json({ message: 'Déconnexion réussie.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  const clientLogout = (req, res) => {
    return res.json({ message: 'Déconnexion réussie.' });
  };

  return { connexion, agentLogout, clientLogout };
}
