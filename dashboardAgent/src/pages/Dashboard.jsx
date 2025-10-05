// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../composants/ToastProvider';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import { getUsers as apiGetUsers } from '../api/client';

export default function Dashboard() {
  // Lire l'utilisateur connecté pour personnaliser la bannière d'accueil
  let currentUser = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw) currentUser = JSON.parse(raw);
  } catch (_) { }
  const displayName = [currentUser?.prenom, currentUser?.nom].filter(Boolean).join(' ') || 'Agent';

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /**
   * @typedef {Object} UserRow
   * @property {string} id
   * @property {string} prenom
   * @property {string} nom
   * @property {string} email
   * @property {string} numTel
   * @property {string} role
   * @property {boolean} blocked
   * @property {number} createdAt
   */
  const [users, setUsers] = useState(/** @type {UserRow[]} */([]));

  // Suivre l'état d'ouverture du sidebar pour adapter la largeur
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebarOpen') === 'true'; } catch (_) { return true; }
  });
  useEffect(() => {
    const onSidebar = (e) => {
      const open = !!(e?.detail?.open);
      setSidebarOpen(open);
    };
    window.addEventListener('sidebar:state', onSidebar);
    return () => window.removeEventListener('sidebar:state', onSidebar);
  }, []);

  const handleAuthError = (err) => {
    if (err && (err.status === 401 || err.status === 403)) {
      navigate('/login');
      return true;
    }
    return false;
  };

  const mapUsers = (arr) => (arr || []).map((u) => ({
    id: String(u._id),
    prenom: u.prenom || '',
    nom: u.nom || '',
    email: u.email || '',
    numTel: u.telephone || u.numTel || '',
    role: u.role || '',
    blocked: Boolean(u.bloquer),
    createdAt: Number(new Date(u.createdAt || Date.now())),
  }));

  const refreshUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiGetUsers();
      setUsers(mapUsers(res?.users));
    } catch (err) {
      if (!handleAuthError(err)) setError(err?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);


  const stats = useMemo(() => {
    const total = users.length;
    const clients = users.filter(u => u.role === 'client').length;
    const distributeurs = users.filter(u => u.role === 'distributeur').length;
    const agents = users.filter(u => u.role === 'agent').length;
    const bloques = users.filter(u => u.blocked).length;
    return [
      { label: 'Clients', value: clients },
      { label: 'Distributeurs', value: distributeurs },
      { label: 'Agents', value: agents },
      { label: 'Bloqués', value: bloques },
      { label: 'Total', value: total },
    ];
  }, [users]);

  // Pagination locale simple
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const filteredUsers = useMemo(() => users, [users]);
  useEffect(() => { setPage(1); }, [rowsPerPage, users]);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);
  const startIndex = filteredUsers.length ? (page - 1) * rowsPerPage + 1 : 0;
  const endIndex = filteredUsers.length ? Math.min(page * rowsPerPage, filteredUsers.length) : 0;

  return (
    <Box sx={{
      px: { sm: 2, md: 6, lg: 8 },
      mb: 5,
      width: sidebarOpen ? '1100px' : '1100px',
      maxWidth: '100%',
      transition: 'width 200ms ease',
    }}>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}
      {loading && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>Chargement...</Typography>
      )}
      <Box
        mb={2}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ m: 0 }}>
          Liste des utilisateurs
        </Typography>
      </Box>

      <TableContainer px={10} component={Paper}>
        <Table size="medium" aria-label="utilisateurs" borderAxis="both" color="primary" variant="outlined">
          <TableHead>
            <TableRow>
              <TableCell>PRENOM</TableCell>
              <TableCell>NOM</TableCell>
              <TableCell>EMAIL</TableCell>
              <TableCell>TELEPHONE</TableCell>
              <TableCell>ROLE</TableCell>
              <TableCell>STATUT</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUsers.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.prenom}</TableCell>
                <TableCell>{u.nom}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.numTel || '-'}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>
                  {u.blocked ? <Chip label="Bloqué" color="error" size="medium" /> : <Chip label="Actif" color="success" size="medium" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box mt={1.5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel id="rows-label">Par page</InputLabel>
            <Select
              labelId="rows-label"
              label="Par page"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            Affichage {startIndex}
            –{endIndex} sur {filteredUsers.length} résultats
          </Typography>
        </Stack>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
          size="small"
          siblingCount={1}
          boundaryCount={1}
        />
      </Box>
    </Box >
  );
}
