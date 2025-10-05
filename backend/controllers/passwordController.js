// @ts-nocheck
const { ObjectId } = require('mongodb');
const { hashPassword, comparePassword } = require('../utils/hash');

module.exports = function createPasswordController(db) {
  if (!db) throw new Error('passwordController init error: db is required');

  const updatePassword = async (req, res) => {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body || {};

    try {
      // Auth required upstream; ensure caller is owner or agent
      if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
      if (req.user.id !== id && req.user.role !== 'agent') {
        return res.status(403).json({ error: 'Accès non autorisé.' });
      }

      if (typeof newPassword !== 'string' || newPassword.length === 0) {
        return res.status(400).json({ error: 'Nouveau mot de passe requis.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
      }

      const usersCol = db.collection('users');
      const user = await usersCol.findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

      // Always verify old password for security, regardless of role
      if (typeof oldPassword !== 'string' || oldPassword.length === 0) {
        return res.status(400).json({ error: 'Ancien mot de passe requis.' });
      }
      const ok = await comparePassword(oldPassword, user.motDePasse);
      if (!ok) return res.status(400).json({ error: 'Ancien mot de passe incorrect.' });

      // Prevent using the same password as before
      const sameAsBefore = await comparePassword(newPassword, user.motDePasse);
      if (sameAsBefore) {
        return res.status(400).json({ error: "Le nouveau mot de passe doit être différent de l’ancien." });
      }

      const hashed = await hashPassword(newPassword, 10);
      await usersCol.updateOne(
        { _id: new ObjectId(id) },
        { $set: { motDePasse: hashed, updatedate: new Date() } }
      );

      return res.json({ message: 'Mot de passe modifié avec succès.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  return { updatePassword };
}
