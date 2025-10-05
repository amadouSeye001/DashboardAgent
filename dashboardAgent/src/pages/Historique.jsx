// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Chip,
} from '@mui/material';
import { useToast } from '../composants/ToastProvider';
import { getTransactions as apiGetTransactions } from '../api/client';

function Historique() {
  const toast = useToast();
  const [transactions, setTransactions] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [query, setQuery] = useState('');

  const handleAuthError = React.useCallback((err) => {
    if (err && (err.status === 401 || err.status === 403)) {
      navigate('/login');
      return true;
    }
    return false;
  }, [navigate]);

  const refreshTransactions = React.useCallback(async (setBusy = true) => {
    if (setBusy) setLoading(true);
    setFetchError('');
    const res = await apiGetTransactions();
    setTransactions(res?.transactions || []);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTransactions = async () => {
      try {
        await refreshTransactions(true);
      } catch (err) {
        if (isMounted && !handleAuthError(err)) {
          setFetchError(err?.message || 'Erreur de chargement des transactions');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTransactions();
    return () => { isMounted = false; };
  }, [refreshTransactions, handleAuthError]);

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const id = String(t.idTransaction || '').toLowerCase();
      const dest = String(t.numCompteDestinataire || '').toLowerCase();
      return id.includes(q) || dest.includes(q);
    });
  }, [query, transactions]);

  return (
    <Box sx={{
      px: { sm: 2, md: 6, lg: 8 },
      mb: 5,
      maxWidth: '100%',
    }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" gutterBottom sx={{ m: 0 }}>
          Historique des transactions
        </Typography>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (id ou compte destinataire)"
          size="small"
          sx={{ width: { xs: '100%', sm: 320 } }}
        />
      </Box>
      {fetchError && <Typography color="error" sx={{ mb: 2 }}>{fetchError}</Typography>}
      {loading && <Typography color="text.secondary" sx={{ mb: 2 }}>Chargement...</Typography>}
      <TableContainer component={Paper}>
        <Table size="medium" aria-label="transactions" borderAxis="both" color="primary" variant="outlined">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Montant</TableCell>
              <TableCell>Compte Destinataire</TableCell>
              <TableCell>État</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((t) => (
              <TableRow key={t.idTransaction} hover>
                <TableCell>{t.idTransaction}</TableCell>
                <TableCell>{new Date(t.dateTransaction).toLocaleString()}</TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell align="right">{t.montant.toLocaleString('fr-FR')} CFA</TableCell>
                <TableCell>{t.numCompteDestinataire || '-'}</TableCell>
                <TableCell>
                  {t.etat === 'reussi' ? (
                    <Chip label="Réussi" color="success" size="medium" />
                  ) : (
                    <Chip label="Annulé" color="default" size="medium" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Historique;