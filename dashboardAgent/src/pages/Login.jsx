import React, { useState } from 'react';
import { Box, Paper, TextField, Typography, Button, Stack, IconButton, InputAdornment } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { login as apiLogin } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
    if (!emailValid || password.trim() === '') {
      setError('Veuillez corriger les erreurs du formulaire');
      return;
    }
    (async () => {
      try {
        setError('');
        setLoading(true);
        const res = await apiLogin({ email: email.trim(), motDePasse: password });

        const user = res?.user;
        // Front checks: agent role, not blocked, not archived
        if (!user) {
          setError('Réponse serveur invalide.');
          return;
        }
        if (user.archived === true) {
          setError('Votre compte est archivé. Veuillez contacter un administrateur.');
          return;
        }
        if (user.bloquer === true) {
          setError('Votre compte est bloqué.');
          return;
        }
        if (user.role !== 'agent') {
          setError("Accès réservé aux agents.");
          return;
        }

        try {
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(user));
        } catch (_) { }
        navigate('/dashboard', { replace: true });
      } catch (err) {
        // Show backend-provided message when available (e.g., 403 bloqué)
        const message = err?.message || 'Erreur de connexion';
        setError(message);
      }
      finally {
        setLoading(false);
      }
    })();
  };

  return (
    <Box sx={{ width: '50%', marginLeft: 60, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper elevation={3} sx={{ p: 3, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" gutterBottom align="center">Connexion</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} align="center">
          Connectez-vous.
        </Typography>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={submitted && (email.trim() === '' || !/^\S+@\S+\.\S+$/.test(email.trim()))}
              helperText={
                submitted && email.trim() === ''
                  ? 'Email requis'
                  : submitted && !/^\S+@\S+\.\S+$/.test(email.trim())
                    ? 'Email invalide'
                    : ''
              }
              fullWidth
            />
            <TextField
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={submitted && password.trim() === ''}
              helperText={submitted && password.trim() === '' ? 'Mot de passe requis' : ''}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {error && (
              <Typography color="error" variant="body2">{error}</Typography>
            )}
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
