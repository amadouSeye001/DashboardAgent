// @ts-nocheck
import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import MuiAppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Drawer from '@mui/material/Drawer';
import Avatar from '@mui/material/Avatar';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, FormControl, InputLabel, Select, MenuItem as MuiMenuItem } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { updateUser as apiUpdateUser, updateUserPassword as apiUpdateUserPassword } from '../api/client';
import Sidebar from './sidebar';
import StatsHeader from './StatsHeader';
import logo from '../assets/react.svg';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';


function stringToColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

function stringAvatar(name) {
  const [first = '', second = ''] = name.split(' ');
  const initials = `${first[0] || ''}${second[0] || ''}`.toUpperCase();
  return {
    sx: {
      bgcolor: stringToColor(name),
      width: 32,
      height: 32,
      fontSize: 14,
    },
    children: initials,
  };
}

export default function MenuAppBar() {
  const theme = useTheme();
  const [, setAnchorEl] = React.useState(null); // kept for backward compatibility
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [anchorPos, setAnchorPos] = React.useState(null);
  const [auth] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const drawerWidth = 180;
  const [refreshTick, setRefreshTick] = React.useState(0);

  // Hidden file input for changing profile photo
  const fileInputRef = React.useRef(null);
  const allowedPhotoExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // Profile edit dialog state
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState('');
  const [editForm, setEditForm] = React.useState(/** @type {{ prenom: string, nom: string, email: string, numTel?: string, role?: string, photoData?: string } | null} */(null));
  // Password dialog state
  const [pwdOpen, setPwdOpen] = React.useState(false);
  const [pwdLoading, setPwdLoading] = React.useState(false);
  const [pwdError, setPwdError] = React.useState('');
  const [pwdForm, setPwdForm] = React.useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  // Toast (Snackbar)
  const [toast, setToast] = React.useState({ open: false, message: '', severity: 'success' });
  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast((t) => ({ ...t, open: false }));
  };

  // Read logged-in user to display avatar initials
  let currentUser = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw) currentUser = JSON.parse(raw);
  } catch { }
  const displayName = [currentUser?.prenom, currentUser?.nom].filter(Boolean).join(' ') || 'Agent';
  const avatarProps = React.useMemo(() => {
    if (currentUser?.photo) {
      return { src: currentUser.photo, sx: { width: 32, height: 32 } };
    }
    return stringAvatar(displayName);
  }, [currentUser?.photo, displayName, refreshTick]);

  const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(({ theme }) => ({
    flexGrow: 1,
    padding: 0,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
    }),
    marginLeft: 0,
    variants: [
      {
        props: ({ open }) => open,
        style: {
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
          }),
          marginLeft: `${drawerWidth}px`,
        },
      },
    ],
  }));

  const AppBar = styled(MuiAppBar)(({ theme }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    zIndex: theme.zIndex.drawer + 1,
  }));

  const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
  }));


  const handleMenu = (event) => {
    // Use anchor position to avoid layout transform issues
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchorPos({ top: Math.round(rect.bottom), left: Math.round(rect.right) });
    setMenuOpen(true);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleModifier = () => {
    setAnchorEl(null);
    setMenuOpen(false);
    setEditError('');
    const base = {
      prenom: currentUser?.prenom || '',
      nom: currentUser?.nom || '',
      email: currentUser?.email || '',
      numTel: currentUser?.telephone || currentUser?.numTel || '',
      role: currentUser?.role || 'client',
      photoData: currentUser?.photo || '',
    };
    setEditForm(base);
    setEditOpen(true);
  };
  const handleModifierMdp = () => {
    setAnchorEl(null);
    setMenuOpen(false);
    setPwdError('');
    setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPwdOpen(true);
    setPwdLoading(false);
    setToast({ open: false, message: '', severity: 'success' });
  };


  const onPickAppBarPhoto = async (file) => {
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    const ok = allowedPhotoExt.some(ext => name.endsWith(ext));
    if (!ok) {
      alert('Extension non autorisée. Formats acceptés: JPG, JPEG, PNG, GIF, WEBP');
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
      if (editOpen) {
        setEditForm((f) => (f ? { ...f, photoData: data } : f));
      } else {
        const userId = currentUser?._id || currentUser?.id;
        if (!userId) throw new Error("Utilisateur introuvable pour la mise à jour");
        await apiUpdateUser(userId, { photo: data });
        try {
          const next = { ...(currentUser || {}), photo: data };
          localStorage.setItem('user', JSON.stringify(next));
        } catch { }
        setRefreshTick((t) => t + 1);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour de la photo de profil");
    } finally {
      // reset input value so same file can be reselected later
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isEmailValid = (v) => /^\S+@\S+\.\S+$/.test(v || '');
  const isPhoneValid = (v) => !v || /^(?:\+?\d{6,15}|\d{6,15})$/.test(v);
  const onEditChange = (field, value) => setEditForm((f) => (f ? { ...f, [field]: value } : f));
  const handleEditChange = (field, value) => onEditChange(field, value);
  const handleEditClose = () => setEditOpen(false);
  const onEditPickPhoto = (file) => onPickAppBarPhoto(file);
  const canSubmitEdit = !!(editForm && editForm.prenom.trim() && editForm.nom.trim() && isEmailValid(editForm.email) && (editForm.role || '').trim());

  // Password change helpers
  const isPasswordValid = (p) => typeof p === 'string' && p.length >= 6;
  const isConfirmValid = pwdForm.confirmPassword === pwdForm.newPassword;
  const requireOld = true; // Toujours exiger l'ancien mot de passe pour la sécurité
  const hasOld = (pwdForm.oldPassword || '').length > 0;
  const isNewDifferent = pwdForm.newPassword !== '' && pwdForm.newPassword !== pwdForm.oldPassword;
  const handlePwdChange = (field, value) => {
    setPwdForm((f) => ({ ...f, [field]: value }));
    if (pwdError) setPwdError('');
  };
  const handlePwdClose = () => setPwdOpen(false);
  const handlePwdSubmit = async () => {
    // Validations before submit
    if (requireOld && !hasOld) {
      setPwdError('Ancien mot de passe requis');
      return;
    }
    if (!isPasswordValid(pwdForm.newPassword)) {
      setPwdError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (!isConfirmValid) {
      setPwdError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!isNewDifferent) {
      setPwdError('Le nouveau mot de passe doit être différent de l’ancien');
      return;
    }
    if (pwdLoading) return;
    try {
      setPwdLoading(true);
      setPwdError('');
      const userId = currentUser?._id || currentUser?.id;
      if (!userId) throw new Error('Utilisateur introuvable');
      await apiUpdateUserPassword(userId, { oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword });
      setPwdOpen(false);
      setToast({ open: true, message: 'Mot de passe modifié avec succès.', severity: 'success' });
    } catch (err) {
      console.error(err);
      setPwdError(err?.message || 'Erreur lors du changement de mot de passe');
      setToast({ open: true, message: err?.message || 'Erreur lors du changement de mot de passe', severity: 'error' });
    } finally {
      setPwdLoading(false);
    }
  };


  const handleEditSave = async () => {
    if (!editForm || !canSubmitEdit || editLoading) return;
    try {
      setEditLoading(true);
      setEditError('');
      const userId = currentUser?._id || currentUser?.id;
      if (!userId) throw new Error('Utilisateur introuvable');
      const payload = {
        prenom: editForm.prenom,
        nom: editForm.nom,
        email: editForm.email,
        numTel: editForm.numTel || '',
        role: editForm.role || 'client',
      };
      if (editForm.photoData) payload.photo = editForm.photoData;
      await apiUpdateUser(userId, payload);
      // Synchronise avec localStorage 
      try {
        const next = { ...(currentUser || {}), ...payload };
        localStorage.setItem('user', JSON.stringify(next));
      } catch { }
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      setEditError(err?.message || 'Erreur lors de la mise à jour');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeconnexion = () => {
    setAnchorEl(null);
    //  Déconnexion
    console.log('Déconnexion');
    try {
      localStorage.removeItem('auth');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch { }
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: mobileOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          marginLeft: mobileOpen ? `${drawerWidth}px` : 0,
          transition: (theme) => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={[{ mr: 2 }, mobileOpen && { display: 'none' }]}
          >
            <MenuIcon />
          </IconButton>
          <img
            width={50}
            height={50}
            src={logo}
            alt="Logo"
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
          />
          <Typography marginLeft={5} variant="h6" noWrap sx={{ flexGrow: 1 }}>
            Dashboard Agent
          </Typography>
          {auth && (
            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar {...avatarProps} />
              </IconButton>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept={allowedPhotoExt.join(',')}
                onChange={(e) => onPickAppBarPhoto(e.target.files?.[0])}
              />
              <Menu
                id="menu-appbar"
                anchorReference="anchorPosition"
                anchorPosition={anchorPos || { top: 0, left: 0 }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={menuOpen}
                onClose={handleClose}
                PaperProps={{ sx: { mt: 1 } }}
              >
                <MenuItem onClick={handleModifier}>Modifier Profil</MenuItem>
                <MenuItem onClick={handleModifierMdp}>Modifier Mot de passe</MenuItem>
                <MenuItem onClick={handleDeconnexion}>Déconnexion</MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>
      {/* Modification Profil*/}
      <Dialog open={editOpen} onClose={handleEditClose} fullWidth maxWidth="sm">
        <DialogTitle>Modifier l'utilisateur</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {editError && <Typography color="error">{editError}</Typography>}
            {/* Avatar cliquable pour modifier la photo */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack alignItems="center" component={Button} variant="text" sx={{ p: 0, minWidth: 0 }} component="label">
                <Avatar src={editForm?.photoData} sx={{ width: 64, height: 64 }}>
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

      {/* Modification Mot de passe */}
      <Dialog open={pwdOpen} onClose={handlePwdClose} fullWidth maxWidth="sm">
        <DialogTitle>Modifier le mot de passe</DialogTitle>
        <DialogContent>
          {pwdError && <Typography color="error" sx={{ mb: 1 }}>{pwdError}</Typography>}
          <TextField
            label="Ancien mot de passe"
            type="password"
            value={pwdForm.oldPassword}
            onChange={(e) => handlePwdChange('oldPassword', e.target.value)}
            error={(requireOld && !hasOld) || (pwdError?.toLowerCase().includes('ancien mot de passe incorrect'))}
            helperText={
              requireOld && !hasOld
                ? 'Ancien mot de passe requis'
                : (pwdError?.toLowerCase().includes('ancien mot de passe incorrect') ? 'Ancien mot de passe incorrect.' : '')
            }
            size="small"
            fullWidth
            margin="dense"
          />
          <TextField
            label="Nouveau mot de passe"
            type="password"
            value={pwdForm.newPassword}
            onChange={(e) => handlePwdChange('newPassword', e.target.value)}
            error={(pwdForm.newPassword !== '' && !isPasswordValid(pwdForm.newPassword)) || (pwdForm.newPassword !== '' && !isNewDifferent)}
            helperText={
              pwdForm.newPassword !== '' && !isPasswordValid(pwdForm.newPassword)
                ? 'Le mot de passe doit contenir au moins 6 caractères'
                : (pwdForm.newPassword !== '' && !isNewDifferent ? 'Le nouveau mot de passe doit être différent de l’ancien' : '')
            }
            size="small"
            fullWidth
            margin="dense"
          />
          <TextField
            label="Confirmer le mot de passe"
            type="password"
            value={pwdForm.confirmPassword}
            onChange={(e) => handlePwdChange('confirmPassword', e.target.value)}
            error={pwdForm.confirmPassword !== '' && !isConfirmValid}
            helperText={pwdForm.confirmPassword !== '' && !isConfirmValid ? 'Les mots de passe ne correspondent pas' : ''}
            size="small"
            fullWidth
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePwdClose}>Annuler</Button>
          <Button onClick={handlePwdSubmit} disabled={(requireOld && !hasOld) || !isPasswordValid(pwdForm.newPassword) || !isConfirmValid || !isNewDifferent || pwdLoading} variant="contained" color="primary">
            {pwdLoading ? 'Validation...' : 'Valider'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box component="nav" sx={{ width: 0, flexShrink: 0 }} aria-label="navigation">
        {mobileOpen && (
          <Drawer
            variant="persistent"
            anchor="left"
            open={mobileOpen}
            sx={{
              '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
            }}
          >
            <Sidebar drawerWidth={drawerWidth} onClose={() => setMobileOpen(false)} />
          </Drawer>
        )}
      </Box>

      {/* Toast notifications */}
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={handleToastClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <MuiAlert elevation={6} variant="filled" onClose={handleToastClose} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </MuiAlert>
      </Snackbar>

      <Main open={mobileOpen}>
        <DrawerHeader />
        {location.pathname !== '/login' && (
          <StatsHeader showStats={location.pathname === '/' || location.pathname.toLowerCase() === '/dashboard'} />
        )}
        <Outlet />
      </Main>
    </Box>
  );
}
