const { ObjectId } = require('mongodb');

module.exports = function createTransactionController(db) {
  if (!db) throw new Error('transactionController init error: db is required');

  const createTransaction = async (req, res) => {
    const { idTransaction, type, montant, numCompteSource, numCompteDestinataire, dateTransaction, etat } = req.body;


    if (!type || !montant || !dateTransaction || !etat) {
      return res.status(400).json({ error: 'Les champs type, montant, dateTransaction et etat sont requis.' });
    }

    if (!['depot', 'retrait', 'transfert'].includes(type)) {
      return res.status(400).json({ error: 'Type de transaction invalide.' });
    }

    if (!['reussi', 'annule'].includes(etat)) {
      return res.status(400).json({ error: 'État de transaction invalide.' });
    }

    try {
      // Always ensure a string idTransaction exists (UUID on FE, fallback here)
      const txId = (idTransaction && String(idTransaction)) || new ObjectId().toHexString();
      const newTransaction = {
        idTransaction: txId,
        type,
        montant: Number(montant),
        numCompteSource,
        numCompteDestinataire,
        dateTransaction: new Date(dateTransaction),
        etat,
        createdAt: new Date(),
      };
      const result = await db.collection('transactions').insertOne(newTransaction);
      res.status(201).json({ message: 'Transaction créée avec succès', transactionId: result.insertedId, idTransaction: txId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  const listTransactions = async (req, res) => {
    try {
      const transactions = await db.collection('transactions').find().sort({ dateTransaction: -1 }).toArray();
      // Backfill idTransaction for legacy docs
      const mapped = transactions.map(t => ({
        ...t,
        idTransaction: t.idTransaction || String(t._id),
      }));
      res.json({ transactions: mapped });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  const cancelTransaction = async (req, res) => {
    // Route uses '/transactions/:id/cancel', but we also support ':idTransaction' for robustness
    const paramId = String(req.params.idTransaction || req.params.id || '');
    try {
      if (!paramId) return res.status(400).json({ error: 'Identifiant de transaction requis.' });

      // Build a robust filter: match by idTransaction OR by _id if paramId is a valid ObjectId
      const or = [{ idTransaction: paramId }];
      try {
        if (ObjectId.isValid(paramId)) {
          or.push({ idTransaction: new ObjectId(paramId) });
        }
      } catch {}

      const filter = { $or: or, etat: 'reussi' };

      const result = await db.collection('transactions').updateOne(
        filter,
        { $set: { etat: 'annule' } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Transaction introuvable ou déjà annulée.' });
      }

      res.json({ message: 'Transaction annulée avec succès.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  return { createTransaction, listTransactions, cancelTransaction };
};