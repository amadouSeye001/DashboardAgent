// @ts-nocheck
const { ObjectId } = require('mongodb');
const { hashPassword } = require('../utils/hash');

module.exports = function createUserController(db) {
  if (!db) throw new Error('userController init error: db is required');

  const createUser = async (req, res) => {
    const { nom, prenom, email, motDePasse, role, numTel, numCompte } = req.body;

    if (!nom || !prenom || !email || !motDePasse || !role) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    if (!['client', 'distributeur'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    try {
      const usersCol = db.collection('users');
      const existingUser = await usersCol.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email déjà utilisé.' });
      }

      // S'assurer que le numéro de compte est unique et présent
      let finalNumCompte = (numCompte || '').trim();
      const genNum = () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
      if (finalNumCompte) {
        const existingCompte = await usersCol.findOne({ numCompte: finalNumCompte });
        if (existingCompte) {
          return res.status(400).json({ error: 'Numéro de compte déjà utilisé.' });
        }
      } else {
        // Générer un numéro unique côté serveur si non fourni
        // Boucle limitée pour éviter un cas extrême
        for (let i = 0; i < 5; i++) {
          const candidate = genNum();
          const exists = await usersCol.findOne({ numCompte: candidate });
          if (!exists) { finalNumCompte = candidate; break; }
        }
        if (!finalNumCompte) {
          // Fallback ultime si collision improbable 5 fois
          finalNumCompte = genNum();
        }
      }

      if (numTel) {
        const existingTel = await usersCol.findOne({ $or: [{ numTel }, { telephone: numTel }] });
        if (existingTel) {
          return res.status(400).json({ error: 'Téléphone déjà utilisé.' });
        }
      }

      const hashedPassword = await hashPassword(motDePasse, 10);

      const newUser = {
        nom,
        prenom,
        email,
        motDePasse: hashedPassword,
        role,
        ...(numTel ? { numTel } : {}),
        ...(finalNumCompte ? { numCompte: finalNumCompte } : {}),
        bloquer: false,
        archived: false,
        dateCreation: new Date(),
        updatedate: new Date(),
      };
      const result = await db.collection('users').insertOne(newUser);
      const userSansMdp = { ...newUser, motDePasse: undefined, _id: result.insertedId };

      return res.status(201).json({ message: 'Utilisateur créé avec succès', user: userSansMdp });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  const updateUser = async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, numTel, photo, } = req.body;

    try {
      const usersCol = db.collection('users');
      const user = await usersCol.findOne({ _id: new ObjectId(id) });
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }

      // Permission: owner or agent
      if (req.user.id !== id && req.user.role !== 'agent') {
        return res.status(403).json({ error: 'Accès non autorisé.' });
      }

      // Profile update path (requires mandatory fields)
      if (!nom || !prenom || !email) {
        return res.status(400).json({ error: 'Nom, prénom et email requis.' });
      }
      const existingEmail = await usersCol.findOne({ email, _id: { $ne: new ObjectId(id) } });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email déjà utilisé.' });
      }

      if (typeof numTel !== 'undefined' && numTel) {
        const existingTel = await usersCol.findOne({ $or: [{ numTel }, { telephone: numTel }], _id: { $ne: new ObjectId(id) } });
        if (existingTel) {
          return res.status(400).json({ error: 'Téléphone déjà utilisé.' });
        }
      }

      const setFields = { nom, prenom, email, updatedate: new Date() };
      if (typeof numTel !== 'undefined') setFields.numTel = numTel;
      if (typeof photo !== 'undefined') setFields.photo = photo;
      await usersCol.updateOne({ _id: new ObjectId(id) }, { $set: setFields });
      return res.json({ message: 'Utilisateur modifié avec succès.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  const deleteUsers = async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Liste d’IDs requise.' });
    }

    try {
      const objectIds = ids.map(id => new ObjectId(id));
      const result = await db.collection('users').updateMany(
        { _id: { $in: objectIds } },
        { $set: { archived: true, archivedAt: new Date(), updatedate: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Aucun utilisateur trouvé.' });
      }

      return res.json({ message: `${result.modifiedCount} utilisateur(s) archivé(s) avec succès.` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  const listUsers = async (req, res) => {
    try {
      const users = await db.collection('users')
        .find({ archived: { $ne: true } })
        .project({ motDePasse: 0 })
        .toArray();
      const normalized = users.map(u => {
        if (!u.numTel && u.telephone) {
          return { ...u, numTel: u.telephone };
        }
        return u;
      });
      return res.json({ users: normalized });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  const blockUsers = async (req, res) => {
    const { ids, bloquer } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || typeof bloquer !== 'boolean') {
      return res.status(400).json({ error: 'Liste d’IDs et statut bloquer requis.' });
    }

    try {
      const objectIds = ids.map(id => new ObjectId(id));
      const result = await db.collection('users').updateMany(
        { _id: { $in: objectIds } },
        { $set: { bloquer, updatedate: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Aucun utilisateur trouvé.' });
      }

      return res.json({ message: `${result.modifiedCount} utilisateur(s) ${bloquer ? 'bloqué(s)' : 'débloqué(s)'} avec succès.` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  return { createUser, updateUser, deleteUsers, listUsers, blockUsers };
}