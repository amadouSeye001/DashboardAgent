// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
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
  IconButton,
  Tooltip,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import { useToast } from '../composants/ToastProvider';
import { getTransactions as apiGetTransactions, cancelTransaction as apiCancelTransaction } from '../api/client';

export default function Annuler() {
  const toast = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [query, setQuery] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [toCancelId, setToCancelId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const refreshTransactions = React.useCallback(async (setBusy = true) => {
    if (setBusy) setLoading(true);
    setFetchError('');
    const res = await apiGetTransactions();
    setTransactions(res?.transactions || []);
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchTx = async () => {
      try {
        await refreshTransactions(true);
      } catch (err) {
        if (mounted) setFetchError(err?.message || 'Erreur de chargement des transactions');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTx();
    return () => { mounted = false; };
  }, [refreshTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const id = String(t.idTransaction || '').toLowerCase();
      const dest = String(t.numCompteDestinataire || '').toLowerCase();
      return id.includes(q) || dest.includes(q);
    });
  }, [query, transactions]);

  const handleCancelRequest = (idTransaction) => {
    setToCancelId(idTransaction);
    setCancelOpen(true);
  };

  const handleCancelClose = () => {
    setCancelOpen(false);
    setToCancelId(null);
    setCancelError('');
    setCancelLoading(false);
  };

  const handleCancelConfirm = async () => {
    if (toCancelId == null || cancelLoading) return;
    try {
      setCancelLoading(true);
      setCancelError('');
      await apiCancelTransaction(toCancelId);
      setTransactions(prev => prev.map(t => t.idTransaction === toCancelId ? { ...t, etat: 'annule' } : t));
      toast.success('Transaction annulée');
      handleCancelClose();
    } catch (err) {
      const is404 = err && (err.status === 404 || /introuvable|annulée/i.test(String(err.message)));
      const msg = is404 ? 'Transaction introuvable ou déjà annulée. Actualisation de la liste.' : (err?.message || "Erreur lors de l'annulation");
      setCancelError(msg);
      toast.error(msg);
    } finally {
      setCancelLoading(false);
      // Toujours resynchroniser pour éviter un état obsolète côté UI
      try { await refreshTransactions(false); } catch {}
    }
  };

  return (
    <Box px={5} mx={0}>
      <Box mb={2} sx={{ px: { sm: 2, md: 6, lg: 8 }, mb: 5 }}>
        <Typography variant="h5" gutterBottom sx={{ m: 0 }}>
          Annuler des transactions
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
      <TableContainer px={10} component={Paper}>
        <Table size="large" aria-label="utilisateurs" borderAxis="both" color="primary" variant="outlined">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Montant</TableCell>
              <TableCell>Compte Destinataire</TableCell>
              <TableCell>État</TableCell>
              <TableCell>Action</TableCell>
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
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {t.etat === 'reussi' && (
                      <Tooltip title="Annuler la transaction">
                        <IconButton size="medium" color="error" onClick={() => handleCancelRequest(t.idTransaction)}>
                          <CancelIcon fontSize="medium" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={cancelOpen} onClose={cancelLoading ? undefined : handleCancelClose}>
        <DialogTitle>Confirmer l'annulation</DialogTitle>
        <DialogContent>
          {cancelError && <Typography color="error" sx={{ mb: 1 }}>{cancelError}</Typography>}
          <Typography>Voulez-vous vraiment annuler cette transaction ? Cette action est irréversible.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClose} disabled={cancelLoading}>Non</Button>
          <Button color="error" variant="contained" onClick={handleCancelConfirm} disabled={cancelLoading}>
            {cancelLoading ? 'Annulation...' : 'Oui, annuler'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
