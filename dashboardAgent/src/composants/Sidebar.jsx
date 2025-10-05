import React, { useContext, useEffect } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory2';
import UndoIcon from '@mui/icons-material/Undo';
import HistoryIcon from '@mui/icons-material/History';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import { NavLink, useLocation } from 'react-router-dom';
import { ColorModeContext } from '../theme/colorMode';
import { Typography } from '@mui/material';

export default function Sidebar({ drawerWidth = 180, onClose = () => { } }) {
  const location = useLocation();
  const theme = useTheme();
  const { mode, setMode } = useContext(ColorModeContext);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const choose = (m) => { setMode(m); handleClose(); };

  // Publier l'état d'ouverture du sidebar pour que les pages puissent s'adapter
  useEffect(() => {
    try {
      localStorage.setItem('sidebarOpen', 'true');
    } catch (_) { }
    window.dispatchEvent(new CustomEvent('sidebar:state', { detail: { open: true } }));
    return () => {
      // Lors du démontage, on indique qu'il n'est plus ouvert
      try {
        localStorage.setItem('sidebarOpen', 'false');
      } catch (_) { }
      window.dispatchEvent(new CustomEvent('sidebar:state', { detail: { open: false } }));
    };
  }, []);

  const handleSidebarClose = () => {
    try {
      localStorage.setItem('sidebarOpen', 'false');
    } catch (_) { }
    window.dispatchEvent(new CustomEvent('sidebar:state', { detail: { open: false } }));
    onClose();
  };

  return (
    <Box sx={{ width: drawerWidth, height: '100%', display: 'flex', flexDirection: 'column' }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton aria-label="fermer le menu" onClick={handleSidebarClose} size="small">
            {theme.direction === 'ltr' ? <MenuIcon /> : <MenuIcon />}
          </IconButton>
        </Box>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        <ListItemButton component={NavLink} to="/dashboard" selected={location.pathname.startsWith('/dashboard')}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>
        <ListItemButton component={NavLink} to="/utilisateurs" selected={location.pathname.startsWith('/utilisateurs')}>
          <ListItemIcon><PeopleIcon /></ListItemIcon>
          <ListItemText primary="Utilisateurs" />
        </ListItemButton>
        <ListItemButton component={NavLink} to="/depot" selected={location.pathname.startsWith('/depot')}>
          <ListItemIcon><InventoryIcon /></ListItemIcon>
          <ListItemText primary="Dépôt" />
        </ListItemButton>
        <ListItemButton component={NavLink} to="/annuler" selected={location.pathname.startsWith('/annuler')}>
          <ListItemIcon><UndoIcon /></ListItemIcon>
          <ListItemText primary="Annuler" />
        </ListItemButton>
        <ListItemButton component={NavLink} to="/historique" selected={location.pathname.startsWith('/historique')}>
          <ListItemIcon><HistoryIcon /></ListItemIcon>
          <ListItemText primary="Historique" />
        </ListItemButton>
      </List>
      <Divider />
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <IconButton
          aria-label="paramètres du thème"
          onClick={handleOpen}
          size="small"
        >
          <SettingsIcon />
          <Typography variant="body2">Paramètres</Typography>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <MenuItem selected={mode === 'light'} onClick={() => choose('light')}>Mode clair</MenuItem>
          <MenuItem selected={mode === 'dark'} onClick={() => choose('dark')}>Mode sombre</MenuItem>
          <MenuItem selected={mode === 'system'} onClick={() => choose('system')}>Mode système</MenuItem>
        </Menu>
      </Box>
    </Box >
  );
}
