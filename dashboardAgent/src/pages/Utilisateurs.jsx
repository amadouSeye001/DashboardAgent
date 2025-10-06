// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../composants/ToastProvider';
import {
  Box,
  Container,
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
  Avatar,
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
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { getUsers as apiGetUsers, deleteUsers as apiDeleteUsers, blockUsers as apiBlockUsers, createUser as apiCreateUser, updateUser as apiUpdateUser } from '../api/client';

/**
 * @typedef {Object} UserRow
 * @property {string} id
 * @property {string} prenom
 * @property {string} nom
 * @property {string} email
 * @property {string} numTel
 * @property {string} role
 * @property {boolean} blocked
 */

export default function Utilisateurs() {
  const toast = useToast();
  const [users, setUsers] = useState(/** @type {UserRow[]} */([]));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState(/** @type {{ id: string, current: boolean } | null} */(null));
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({ prenom: '', nom: '', email: '', numTel: '', role: 'client', photoData: '', numCompte: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState(/** @type {{ id: string, prenom: string, nom: string, email: string, numTel?: string, role?: string, photoData?: string } | null} */(null));
  const [selectedIds, setSelectedIds] = useState(/** @type {string[]} */([]));
  const [bulkBlockOpen, setBulkBlockOpen] = useState(false);
  const [bulkBlockStatus, setBulkBlockStatus] = useState(/** @type {boolean | null} */(null));
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);


  const handleAuthError = (err) => {
    if (err && (err.status === 401 || err.status === 403)) {
      navigate('/login');
      return true;
    }
    return false;
  };

  const mapUsers = (arr) => (arr || []).map((u) => ({
    id: String(u._id),
    nom: u.nom || '',
    prenom: u.prenom || '',
    email: u.email || '',
    numTel: u.telephone || u.numTel || '',
    role: u.role || '',
    numCompte: u.numCompte || '',
    blocked: Boolean(u.bloquer),
    createdAt: Number(new Date(u.createdAt || Date.now())),
  }));

  const refreshUsers = async (setBusy = true) => {
    let ignore = false;
    try {
      if (setBusy) setLoading(true);
      setFetchError('');
      const res = await apiGetUsers();
      const rows = mapUsers(res?.users);
      if (!ignore) setUsers(rows);
    } catch (err) {
      if (handleAuthError(err)) return;
      setFetchError(err?.message || 'Erreur de chargement');
    } finally {
      if (setBusy) setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers(true);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? users.filter((u) =>
        [u.nom, u.prenom, u.email, u.role]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      : users;
    return [...base].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [query, users, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [query, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);
  const startIndex = filteredUsers.length ? (page - 1) * rowsPerPage + 1 : 0;
  const endIndex = filteredUsers.length ? Math.min(page * rowsPerPage, filteredUsers.length) : 0;

  const pageIds = useMemo(() => paginatedUsers.map(u => u.id), [paginatedUsers]);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const somePageSelected = pageIds.some(id => selectedIds.includes(id)) && !allPageSelected;

  const toggleOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAllPage = () => {
    setSelectedIds(prev => allPageSelected ? prev.filter(id => !pageIds.includes(id)) : Array.from(new Set([...prev, ...pageIds])));
  };
  const clearSelection = () => setSelectedIds([]);

  const requestBulkBlock = (bloquer) => {
    if (!selectedIds.length) return;
    // Vérifs d'état: si on demande bloquer mais tous sont déjà bloqués
    const selected = users.filter(u => selectedIds.includes(u.id));
    const allAlreadyBlocked = selected.length > 0 && selected.every(u => !!u.blocked);
    const allAlreadyActive = selected.length > 0 && selected.every(u => !u.blocked);
    if (bloquer && allAlreadyBlocked) {
      toast.info('Utilisateur(s) déjà bloqué(s)');
      return;
    }
    if (!bloquer && allAlreadyActive) {
      toast.info('Utilisateur(s) déjà actif(s)');
      return;
    }
    setBulkBlockStatus(bloquer);
    setBulkBlockOpen(true);
  };
  const closeBulkBlock = () => { setBulkBlockOpen(false); setBulkBlockStatus(null); };
  const confirmBulkBlock = async () => {
    if (bulkBlockStatus === null) return closeBulkBlock();
    await handleBulkBlock(bulkBlockStatus);
    closeBulkBlock();
  };

  const requestBulkArchive = () => {
    if (!selectedIds.length) return;
    setBulkArchiveOpen(true);
  };
  const closeBulkArchive = () => setBulkArchiveOpen(false);
  const confirmBulkArchive = async () => {
    await handleBulkArchive();
    closeBulkArchive();
  };

  const handleBulkBlock = async (bloquer) => {
    if (!selectedIds.length) return;
    try {
      toast.info(bloquer ? 'Blocage en cours...' : 'Déblocage en cours...');
      await apiBlockUsers(selectedIds, bloquer);
      await refreshUsers(false);
      clearSelection();
      toast.success(bloquer ? 'Utilisateurs bloqués' : 'Utilisateurs débloqués');
    } catch (err) {
      if (!handleAuthError(err)) toast.error(err?.message || 'Erreur action groupée');
    }
  };

  const handleBulkArchive = async () => {
    if (!selectedIds.length) return;
    try {
      toast.info('Suppression en cours...');
      await apiDeleteUsers(selectedIds);
      await refreshUsers(false);
      clearSelection();
      toast.success('Utilisateurs supprimés');
    } catch (err) {
      if (!handleAuthError(err)) toast.error(err?.message || 'Erreur archivage groupé');
    }
  };

  // Utilisateur courant (prévention auto‑blocage et auto‑suppression)
  const me = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (err) { console.warn('Unable to read user from localStorage in Utilisateurs', err); return null; }
  }, []);

  const handleBlock = async (id, current) => {
    // current: true => déjà bloqué, false => actif
    // Empêche de se bloquer soi-même
    if (me && String(me._id || me.id) === String(id)) {
      toast.warning('Vous ne pouvez pas vous bloquer vous‑même');
      return;
    }
    // Vérifier l'état actuel le plus récent côté UI
    const row = users.find(u => String(u.id) === String(id));
    const latestBlocked = row ? !!row.blocked : !!current;
    const intendedBloquer = !current; // on inverse l'état courant passé
    if (intendedBloquer && latestBlocked) {
      toast.info('Utilisateur déjà bloqué');
      return;
    }
    if (!intendedBloquer && !latestBlocked) {
      toast.info('Utilisateur actif');
      return;
    }
    try {
      await apiBlockUsers([id], intendedBloquer);
      await refreshUsers(false);
      toast.success(!current ? 'Utilisateur bloqué' : 'Utilisateur débloqué');
    } catch (err) {
      if (!handleAuthError(err)) toast.error(err?.message || 'Erreur action bloquer');
    }
  };

  const handleBlockRequest = (id, current) => {
    // Vérifs simples pour afficher les messages attendus si l'utilisateur clique une action incohérente
    // (Même si dans l'UI de ligne on propose toujours l'action inverse.)
    if (current === true) {
      // l'UI propose Débloquer; si jamais on tentait Bloquer sur un déjà bloqué
      // on aurait montré le message plus haut
    } else {
      // current === false, l'UI propose Bloquer
    }
    setBlockTarget({ id, current });
    setBlockOpen(true);
  };
  const handleBlockClose = () => {
    setBlockOpen(false);
    setBlockTarget(null);
  };
  const handleBlockConfirm = async () => {
    if (!blockTarget) return;
    await handleBlock(blockTarget.id, blockTarget.current);
    handleBlockClose();
  };

  const handleEditOpen = (u) => {
    setEditError('');
    setEditForm({ id: u.id, prenom: u.prenom, nom: u.nom, email: u.email, numTel: u.numTel || u.telephone || '', role: u.role || 'client', photoData: '' });
    setEditOpen(true);
  };
  const handleEditClose = () => { setEditOpen(false); setEditForm(null); };
  const handleEditChange = (field, value) => setEditForm((f) => (f ? { ...f, [field]: value } : f));
  const canSubmitEdit = !!(editForm && editForm.prenom.trim() && editForm.nom.trim() && /^\S+@\S+\.\S+$/.test(editForm.email) && (editForm.role || '').trim());
  const allowedPhotoExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const onEditPickPhoto = async (file) => {
    if (!file) return;
    const name = file.name?.toLowerCase() || '';
    const ok = allowedPhotoExt.some(ext => name.endsWith(ext));
    if (!ok) {
      setEditError('Extension non autorisée. Formats acceptés: JPG, JPEG, PNG, GIF, WEBP');
      return;
    }
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
    try {
      const data = await toBase64(file);
      setEditForm((f) => (f ? { ...f, photoData: data } : f));
      setEditError('');
    } catch (err) {
      console.warn('Unable to read selected photo for user edit', err);
      setEditError("Impossible de lire l'image sélectionnée");
    }
  };
  const handleEditSave = async () => {
    if (!editForm || !canSubmitEdit || editLoading) return;
    try {
      setEditLoading(true);
      setEditError('');
      // Uniqueness checks (exclude current user)
      const currentId = editForm.id;
      const email = (editForm.email || '').trim().toLowerCase();
      const emailExists = users.some(u => u.id !== currentId && (u.email || '').toLowerCase() === email);
      const norm = (v) => String(v || '').replace(/\D/g, '');
      const phone = norm(editForm.numTel);
      const phoneExists = !!phone && users.some(u => u.id !== currentId && norm(u.numTel || u.telephone) === phone);
      if (emailExists || phoneExists) {
        const parts = [];
        if (emailExists) parts.push('Email déjà utilisé');
        if (phoneExists) parts.push('Téléphone déjà utilisé');
        setEditError(parts.join(' • '));
        return;
      }
      const payload = { nom: editForm.nom, prenom: editForm.prenom, email: editForm.email, numTel: editForm.numTel || '', role: editForm.role || 'client' };
      if (editForm.photoData) payload.photo = editForm.photoData; // base64 data URL (backend should handle or ignore)
      await apiUpdateUser(editForm.id, payload);
      // Re-fetch depuis le serveur pour garder la source de vérité
      await refreshUsers(false);
      handleEditClose();
    } catch (err) {
      if (!handleAuthError(err)) setEditError(err?.message || 'Erreur lors de la modification');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteRequest = (id) => {
    if (me && String(me._id || me.id) === String(id)) {
      toast.warning("Vous ne pouvez pas supprimer votre propre compte");
      return;
    }
    setToDeleteId(id);
    setDeleteOpen(true);
  };
  const handleDeleteClose = () => {
    setDeleteOpen(false);
    setToDeleteId(null);
  };
  const handleDeleteConfirm = async () => {
    if (toDeleteId == null) return;
    try {
      await apiDeleteUsers([toDeleteId]);
      await refreshUsers(false);
    } catch (err) {
      if (!handleAuthError(err)) toast.error(err?.message || 'Erreur suppression');
    } finally {
      handleDeleteClose();
    }
  };

  const openCreate = () => {
    setCreateError('');
    setCreateForm({ prenom: '', nom: '', email: '', numTel: '', role: 'client', photoData: '', numCompte: '' });
    setCreateOpen(true);
  };
  const closeCreate = () => {
    setCreateOpen(false);
    setCreateForm({ prenom: '', nom: '', email: '', numTel: '', role: 'client', photoData: '', numCompte: '' });
  };
  const onCreateChange = (field, value) => setCreateForm((f) => ({ ...f, [field]: value }));
  const isEmailValid = (v) => /^\S+@\S+\.\S+$/.test(v);
  const isPhoneValid = (v) => !v || /^(?:\+?\d{6,15}|\d{6,15})$/.test(v);
  const canSubmitCreate = createForm.prenom.trim() && createForm.nom.trim() && isEmailValid(createForm.email) && createForm.role.trim();
  const DEFAULT_PASSWORD = 'passer123';
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  // Génère un numéro de compte aléatoire de 10 chiffres
  const generateNumCompte = () => {
    let s = '';
    for (let i = 0; i < 10; i++) s += Math.floor(Math.random() * 10).toString();
    return s;
  };
  const openConfirmCreate = () => {
    if (!canSubmitCreate) return;
    // Uniqueness checks on the client for immediate feedback
    const email = (createForm.email || '').trim().toLowerCase();
    const emailExists = users.some(u => (u.email || '').toLowerCase() === email);
    const norm = (v) => String(v || '').replace(/\D/g, '');
    const phone = norm(createForm.numTel);
    const phoneExists = !!phone && users.some(u => norm(u.numTel || u.telephone) === phone);

    if (emailExists || phoneExists) {
      const parts = [];
      if (emailExists) parts.push('Email déjà utilisé');
      if (phoneExists) parts.push('Téléphone déjà utilisé');
      setCreateError(parts.join(' • '));
      return;
    }
    // Générer un numéro de compte si absent pour l'afficher dans la confirmation
    const currentNC = (createForm.numCompte || '').trim();
    if (!currentNC) {
      const nc = generateNumCompte();
      setCreateForm(f => ({ ...f, numCompte: nc }));
    }
    setCreateError('');
    setConfirmCreateOpen(true);
  };
  const closeConfirmCreate = () => setConfirmCreateOpen(false);
  const submitCreate = async () => {
    if (!canSubmitCreate || createLoading) return;
    try {
      setCreateLoading(true);
      setCreateError('');
      // Re-check uniqueness just before submit in case the list changed
      const email = (createForm.email || '').trim().toLowerCase();
      const emailExists = users.some(u => (u.email || '').toLowerCase() === email);
      const norm = (v) => String(v || '').replace(/\D/g, '');
      const phone = norm(createForm.numTel);
      const phoneExists = !!phone && users.some(u => norm(u.numTel || u.telephone) === phone);
      if (emailExists || phoneExists) {
        const parts = [];
        if (emailExists) parts.push('Email déjà utilisé');
        if (phoneExists) parts.push('Téléphone déjà utilisé');
        setCreateError(parts.join(' • '));
        return;
      }
      const payload = { prenom: createForm.prenom, nom: createForm.nom, email: createForm.email, numTel: createForm.numTel, role: createForm.role, motDePasse: DEFAULT_PASSWORD };
      // Utiliser le numéro de compte généré et affiché à l'utilisateur
      payload.numCompte = (createForm.numCompte || '').trim() || generateNumCompte();
      if (createForm.photoData) payload.photo = createForm.photoData; // optional
      const res = await apiCreateUser(payload);
      const u = res?.user || res;
      if (!u || !u._id) throw new Error('Création échouée');
      const row = {
        id: String(u._id),
        nom: u.nom || createForm.nom,
        prenom: u.prenom || createForm.prenom,
        email: u.email || createForm.email,
        numTel: u.numTel || createForm.numTel || '',
        role: u.role || createForm.role,
        numCompte: u.numCompte || payload.numCompte || '',
        blocked: Boolean(u.bloquer),
        createdAt: Number(new Date(u.createdAt || Date.now())),
      };
      // Afficher immédiatement l'utilisateur avec son N° de compte
      setUsers(prev => [row, ...prev]);
      // Re-fetch depuis le serveur pour garder la source de vérité
      await refreshUsers(false);
      // Réinitialiser les filtres afin que le nouvel utilisateur soit immédiatement visible.
      setQuery('');
      // Afficher le nouvel utilisateur créé
      setPage(1);
      // Réinitialiser le formulaire
      setCreateForm({ prenom: '', nom: '', email: '', numTel: '', role: 'client', photoData: '', numCompte: '' });
      setCreateOpen(false);
      toast.success('Utilisateur créé avec succès');
      setCreateError('');
      setCreateClose(true);
    } catch (err) {
      setCreateError(err?.message || 'Erreur lors de la création');
    } finally {
      setCreateLoading(false);
    }
  };

  // Optional photo pick for creation
  const onCreatePickPhoto = async (file) => {
    if (!file) return;
    const name = file.name?.toLowerCase() || '';
    const ok = allowedPhotoExt.some(ext => name.endsWith(ext));
    if (!ok) {
      setCreateError('Extension non autorisée. Formats acceptés: JPG, JPEG, PNG, GIF, WEBP');
      return;
    }
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
    try {
      const data = await toBase64(file);
      setCreateForm((f) => ({ ...f, photoData: data }));
      setCreateError('');
    } catch (err) {
      console.warn('Unable to read selected photo for user creation', err);
      setCreateError("Impossible de lire l'image sélectionnée");
    }
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        px: { xs: 1, sm: 2, md: 6, lg: 6 },
        py: { xs: 2, md: 3 },
      }}
    >

      {fetchError && (
        <Typography color="error" sx={{ mb: 2 }}>{fetchError}</Typography>
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
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, email, role)"
            size="small"
            sx={{ width: { xs: '100%', sm: 320 } }}
          />
          <Button variant="outlined" color="warning" disabled={!selectedIds.length} onClick={() => requestBulkBlock(true)}>Bloquer</Button>
          <Button variant="outlined" color="success" disabled={!selectedIds.length} onClick={() => requestBulkBlock(false)}>Débloquer</Button>
          <Button variant="outlined" color="error" disabled={!selectedIds.length} onClick={requestBulkArchive}>Supprimer</Button>
          <Button variant="contained" onClick={openCreate}>Créer un compte</Button>
        </Stack>
      </Box>

      {/* Confirmation actions groupées */}
      <Dialog open={bulkBlockOpen} onClose={closeBulkBlock}>
        <DialogTitle>{bulkBlockStatus ? 'Confirmer le blocage' : 'Confirmer le déblocage'}</DialogTitle>
        <DialogContent>
          <Typography>Appliquer cette action à {selectedIds.length} utilisateur(s) sélectionné(s) ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkBlock}>Annuler</Button>
          <Button variant="contained" color={bulkBlockStatus ? 'warning' : 'success'} onClick={confirmBulkBlock}>
            {bulkBlockStatus ? 'Bloquer' : 'Débloquer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkArchiveOpen} onClose={closeBulkArchive}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Supprimer (archiver) {selectedIds.length} utilisateur(s) sélectionné(s) ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBulkArchive}>Annuler</Button>
          <Button variant="contained" color="error" onClick={confirmBulkArchive}>Supprimer</Button>
        </DialogActions>
      </Dialog>
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="medium" aria-label="utilisateurs" sx={{ minWidth: 1000 }}>
          <TableHead color="primary">
            <TableRow >
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={somePageSelected}
                  checked={allPageSelected}
                  onChange={toggleAllPage}
                  inputProps={{ 'aria-label': 'select all' }}
                />
              </TableCell>
              <TableCell>N° COMPTE</TableCell>
              <TableCell>PRENOM</TableCell>
              <TableCell>NOM</TableCell>
              <TableCell>EMAIL</TableCell>
              <TableCell>TELEPHONE</TableCell>
              <TableCell>ROLE</TableCell>
              <TableCell>STATUT</TableCell>
              <TableCell>ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUsers.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedIds.includes(u.id)} onChange={() => toggleOne(u.id)} />
                </TableCell>
                <TableCell>{u.numCompte || '-'}</TableCell>
                <TableCell>{u.prenom}</TableCell>
                <TableCell>{u.nom}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.numTel || '-'}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>
                  {u.blocked ? <Chip label="Bloqué" color="error" size="medium" /> : <Chip label="Actif" color="success" size="medium" />}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Modifier">
                      <IconButton size="medium" onClick={() => handleEditOpen(u)}>
                        <EditIcon fontSize="medium" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={u.blocked ? 'Débloquer' : 'Bloquer'}>
                      <IconButton
                        size="medium"
                        color={u.blocked ? 'success' : 'warning'}
                        onClick={() => handleBlockRequest(u.id, u.blocked)}
                      >
                        <BlockIcon fontSize="medium" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="medium" color="error" onClick={() => handleDeleteRequest(u.id)}>
                        <DeleteIcon fontSize="medium" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
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

      {/* Suppression */}
      <Dialog open={deleteOpen} onClose={handleDeleteClose}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer cet utilisateur ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      {/* Bloquer / Débloquer */}
      <Dialog open={blockOpen} onClose={handleBlockClose}>
        <DialogTitle>{blockTarget?.current ? 'Confirmer le déblocage' : 'Confirmer le blocage'}</DialogTitle>
        <DialogContent>
          <Typography>
            {blockTarget?.current
              ? 'Voulez-vous vraiment débloquer cet utilisateur ?'
              : 'Voulez-vous vraiment bloquer cet utilisateur ?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBlockClose}>Annuler</Button>
          <Button color={blockTarget?.current ? 'success' : 'warning'} variant="contained" onClick={handleBlockConfirm}>
            {blockTarget?.current ? 'Débloquer' : 'Bloquer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modification */}
      <Dialog open={editOpen} onClose={handleEditClose} fullWidth maxWidth="md">
        <DialogTitle>Modifier l'utilisateur</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {editError && <Typography color="error">{editError}</Typography>}
            {/* Avatar cliquable pour modifier la photo */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack alignItems="center" component={Button} variant="text" sx={{ p: 0, minWidth: 0 }} component="label">
                <Avatar cursor="pointer" src={editForm?.photoData} sx={{ width: 64, height: 64 }}>
                  {(editForm?.prenom || 'U').slice(0, 1).toUpperCase()}
                </Avatar>
                <input
                  hidden
                  type="file"
                  accept={allowedPhotoExt.join(',')}
                  onChange={(e) => onEditPickPhoto(e.target.files?.[0])}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">Cliquez sur l'avatar pour changer la photo (JPG, JPEG, PNG, GIF, WEBP)</Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Prénom"
                value={editForm?.prenom || ''}
                onChange={(e) => handleEditChange('prenom', e.target.value)}
                error={!!editForm && !editForm.prenom.trim()}
                helperText={!!editForm && !editForm.prenom.trim() ? 'Prénom requis' : ''}
                size="small"
                fullWidth
              />
              <TextField
                label="Nom"
                value={editForm?.nom || ''}
                onChange={(e) => handleEditChange('nom', e.target.value)}
                error={!!editForm && !editForm.nom.trim()}
                helperText={!!editForm && !editForm.nom.trim() ? 'Nom requis' : ''}
                size="small"
                fullWidth
              />
            </Stack>
            <TextField
              label="Email"
              type="email"
              value={editForm?.email || ''}
              onChange={(e) => handleEditChange('email', e.target.value)}
              error={!!editForm && !!editForm.email && !isEmailValid(editForm.email)}
              helperText={!!editForm && !!editForm.email && !isEmailValid(editForm.email) ? 'Email invalide' : ''}
              size="small"
              fullWidth
            />
            <TextField
              label="Téléphone"
              value={editForm?.numTel || ''}
              onChange={(e) => handleEditChange('numTel', e.target.value)}
              error={!!editForm && !!editForm.numTel && !isPhoneValid(editForm.numTel)}
              helperText={!!editForm && !!editForm.numTel && !isPhoneValid(editForm.numTel) ? 'Téléphone invalide (6-15 chiffres)' : ''}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Annuler</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={!canSubmitEdit || editLoading}>{editLoading ? 'Sauvegarde...' : 'Enregistrer'}</Button>
        </DialogActions>
      </Dialog>

      {/* Création */}
      <Dialog open={createOpen} onClose={closeCreate} fullWidth maxWidth="sm">
        <DialogTitle>Créer un compte</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {createError && <Typography color="error">{createError}</Typography>}
            {/* Avatar cliquable pour ajouter une photo (optionnel) */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack alignItems="center" component={Button} variant="text" sx={{ p: 0, minWidth: 0 }} component="label">
                <Avatar src={createForm.photoData} sx={{ width: 64, height: 64 }}>
                  {(createForm.prenom || 'U').slice(0, 1).toUpperCase()}
                </Avatar>
                <input
                  hidden
                  type="file"
                  accept={allowedPhotoExt.join(',')}
                  onChange={(e) => onCreatePickPhoto(e.target.files?.[0])}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">Cliquez sur l'avatar pour ajouter une photo (JPG, JPEG, PNG, GIF, WEBP)</Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Prénom"
                value={createForm.prenom}
                onChange={(e) => onCreateChange('prenom', e.target.value)}
                error={!!createForm && !createForm.prenom.trim()}
                helperText={!!createForm && !createForm.prenom.trim() ? 'Prénom requis' : ''}
                size="small"
                fullWidth
              />
              <TextField
                label="Nom"
                value={createForm.nom}
                onChange={(e) => onCreateChange('nom', e.target.value)}
                error={!!createForm && !createForm.nom.trim()}
                helperText={!!createForm && !createForm.nom.trim() ? 'Nom requis' : ''}
                size="small"
                fullWidth
              />
            </Stack>
            <TextField
              label="Email"
              type="email"
              value={createForm.email}
              onChange={(e) => onCreateChange('email', e.target.value)}
              error={!!createForm.email && !isEmailValid(createForm.email)}
              helperText={!!createForm.email && !isEmailValid(createForm.email) ? 'Email invalide' : ''}
              size="small"
              fullWidth
            />
            <TextField
              label="Téléphone"
              value={createForm.numTel}
              onChange={(e) => onCreateChange('numTel', e.target.value)}
              error={!!createForm.numTel && !isPhoneValid(createForm.numTel)}
              helperText={!!createForm.numTel && !isPhoneValid(createForm.numTel) ? 'Téléphone invalide (6-15 chiffres)' : ''}
              size="small"
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel id="role-create-label">Rôle</InputLabel>
              <Select labelId="role-create-label" label="Rôle" value={createForm.role} onChange={(e) => onCreateChange('role', e.target.value)}>
                <MenuItem value="client">client</MenuItem>
                <MenuItem value="distributeur">distributeur</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreate}>Annuler</Button>
          <Button variant="contained" onClick={openConfirmCreate} disabled={!canSubmitCreate || createLoading}>{createLoading ? 'Création...' : 'Créer'}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation création */}
      <Dialog open={confirmCreateOpen} onClose={closeConfirmCreate}>
        <DialogTitle>Confirmer la création</DialogTitle>
        <DialogContent>
          <Typography>Un mot de passe par défaut sera attribué: <strong>{DEFAULT_PASSWORD}</strong></Typography>
          <Typography>Le numéro de compte: <strong>{createForm.numCompte}</strong></Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmCreate}>Annuler</Button>
          <Button variant="contained" onClick={submitCreate} disabled={!canSubmitCreate || createLoading}>Confirmer</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}