import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Card, CardContent } from '@mui/material';
import { getUsers as apiGetUsers } from '../api/client';

export default function StatsHeader({ showStats = true, title = 'Bienvenue', sx = {} }) {
  // Compute display name from localStorage
  let displayName = 'Agent';
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      const n = [u?.prenom, u?.nom].filter(Boolean).join(' ');
      if (n) displayName = n;
    }
  } catch (_) { /* noop */ }

  /**
   * @typedef {Object} RawUser
   * @property {string} [role]
   * @property {boolean} [bloquer]
   */
  const [users, setUsers] = useState(/** @type {RawUser[]} */([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiGetUsers();
        if (!ignore) setUsers(Array.isArray(res?.users) ? res.users : []);
      } catch (err) {
        if (!ignore) setError(err?.message || 'Erreur chargement statistiques');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => { ignore = true; };
  }, []);

  const stats = useMemo(() => {
    const mapped = (users || []).map((u) => ({
      role: u.role || '',
      blocked: Boolean(u.bloquer),
    }));
    const total = mapped.length;
    const clients = mapped.filter((u) => u.role === 'client').length;
    const distributeurs = mapped.filter((u) => u.role === 'distributeur').length;
    const agents = mapped.filter((u) => u.role === 'agent').length;
    const bloques = mapped.filter((u) => u.blocked).length;
    return [
      { label: 'Clients', value: clients },
      { label: 'Distributeurs', value: distributeurs },
      { label: 'Agents', value: agents },
      { label: 'Bloqués', value: bloques },
      { label: 'Total', value: total },
    ];
  }, [users]);

  return (
    <Box px={{ xs: 2, sm: 3, md: 4 }} py={{ xs: 2, md: 3 }} sx={{ width: '100%', maxWidth: '100%' }}>
      <Card
        elevation={1}
        sx={{
          mb: 2,
          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'primary.contrastText',
          borderRadius: 3,
          width: '100%',
          ...sx,
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {title} {displayName}
          </Typography>
        </CardContent>
      </Card>

      {showStats && (
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2, sm: 3 },
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              md: 'repeat(5, minmax(0, 1fr))',
            },
            alignItems: 'center',
          }}
        >
          {loading ? (
            <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            stats.map((s) => (
              <Paper
                key={s.label}
                elevation={2}
                sx={{
                  width: 140,
                  height: 140,
                  mx: 'auto',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  p: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                <Typography variant="h4" fontWeight={700}>{s.value}</Typography>
              </Paper>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
