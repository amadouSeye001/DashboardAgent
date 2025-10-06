// @ts-nocheck
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState({ message: '', severity: 'info', autoHideDuration: 3000 });

  const show = useCallback((message, { severity = 'info', autoHideDuration = 3000 } = {}) => {
    setOptions({ message, severity, autoHideDuration });
    setOpen(true);
  }, []);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const api = useMemo(() => ({
    show,
    success: (msg, opts) => show(msg, { severity: 'success', ...(opts || {}) }),
    error: (msg, opts) => show(msg, { severity: 'error', ...(opts || {}) }),
    warning: (msg, opts) => show(msg, { severity: 'warning', ...(opts || {}) }),
    info: (msg, opts) => show(msg, { severity: 'info', ...(opts || {}) }),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Snackbar open={open} autoHideDuration={options.autoHideDuration} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleClose} severity={options.severity} variant="filled" sx={{ width: '100%' }}>
          {options.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}