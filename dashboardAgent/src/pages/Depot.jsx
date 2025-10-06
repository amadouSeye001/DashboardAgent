// @ts-nocheck
import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Stack, Button, InputAdornment, CircularProgress } from '@mui/material';
import { useToast } from '../composants/ToastProvider';
import { getUsers as apiGetUsers, createTransaction as apiCreateTransaction } from '../api/client';
import { v4 as uuidv4 } from 'uuid';

export default function Depot() {
  const toast = useToast();
  const [numCompte, setNumCompte] = useState('');
  const [montant, setMontant] = useState('');
  const [errors, setErrors] = useState({ numCompte: '', montant: '' });
  const [checking, setChecking] = useState(false);

  const onNumCompteChange = (e) => {
    const v = e.target.value.replace(/\D+/g, '');
    setNumCompte(v);
    setErrors((prev) => ({ ...prev, numCompte: v.length < 6 ? 'Numéro du compte trop court (min 6 chiffres)' : '' }));
  };

  const onMontantChange = (e) => {
    const raw = e.target.value.replace(',', '.');
    const valid = raw.replace(/[^0-9.]/g, '');
    const parts = valid.split('.');
    const normalized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : valid;
    setMontant(normalized);
    const n = parseFloat(normalized);
    setErrors((prev) => ({ ...prev, montant: !n || n <= 0 ? 'Montant invalide' : '' }));
  };

  const canSubmit = numCompte.trim().length >= 6 && !!parseFloat(montant) && parseFloat(montant) > 0 && !errors.numCompte && !errors.montant;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setChecking(true);
      const res = await apiGetUsers();
      const users = Array.isArray(res?.users) ? res.users : [];
      const found = users.find((u) => String(u.numCompte || '').trim() === numCompte.trim());
      if (!found) {
        setErrors((prev) => ({ ...prev, numCompte: 'Compte inexistant' }));
        return;
      }
      if (montant <= 99) {
        setErrors((prev) => ({ ...prev, montant: 'Dépôt minimum 100 FCFA' }));
        return;
      }
      if (found.bloquer) {
        setErrors((prev) => ({ ...prev, numCompte: 'Compte bloqué' }));
        return;
      }
      const role = String(found.role || '').toLowerCase();
      if (role !== 'distributeur') {
        setErrors((prev) => ({ ...prev, numCompte: "Le compte n'est pas un distributeur" }));
        return;
      }
    } catch (err) {
      console.warn('Unable to verify account for deposit', err);
      setErrors((prev) => ({ ...prev, numCompte: "Impossible de vérifier le compte pour l'instant" }));
      return;
    } finally { setChecking(false); }
    try {
      const payload = {
        idTransaction: uuidv4(),
        type: 'depot',
        montant: parseFloat(montant),
        numCompteDestinataire: numCompte.trim(),
        dateTransaction: new Date().toISOString(),
        etat: 'reussi',
      };
      await apiCreateTransaction(payload);
      setNumCompte('');
      setMontant('');
      setErrors({ numCompte: '', montant: '' });
      toast.success('Dépôt effectué avec succès');
    } catch (err) {
      console.warn('Unable to create transaction for deposit', err);
      const msg = err?.message || "Erreur lors de la création de la transaction";
      toast.error(msg);
    }
  };

  return (
    <Box px={40}>
      <Box mb={2}>
        <Typography variant="h5" gutterBottom sx={{ m: 0 }}>Dépôt à un distributeur</Typography>
      </Box>
      <Paper sx={{ p: 2 }}>
        <Box display="block" component="form" onSubmit={onSubmit} noValidate>
          <Stack display="block">
            <TextField
              label="Numéro de compte"
              value={numCompte}
              onChange={onNumCompteChange}
              inputMode="numeric"
              placeholder="Ex: 1234567890"
              error={!!errors.numCompte}
              helperText={errors.numCompte}
              fullWidth
              size="small"
            />
            <TextField
              style={{ marginTop: '20px' }}
              label="Montant en FCFA"
              value={montant}
              onChange={onMontantChange}
              placeholder="Ex: 10000"
              error={!!errors.montant}
              helperText={errors.montant}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"></InputAdornment>,
              }}
            />
          </Stack>
          <Box mt={2} ml={20}>
            <Button type="submit" variant="contained" disabled={!canSubmit || checking}>
              {checking ? <CircularProgress size={18} color="inherit" /> : 'Valider'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
