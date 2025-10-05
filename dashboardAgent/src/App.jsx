import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './composants/ToastProvider';
import Dashboard from './pages/Dashboard';
import Utilisateurs from './pages/Utilisateurs';
import Depot from './pages/Depot';
import Annuler from './pages/Annuler';
import Historique from './pages/Historique';
import Body from './composants/body';
import Login from './pages/Login';

function App() {
  const PrivateRoute = ({ children }) => {
    let authed = false;
    try {
      authed = Boolean(localStorage.getItem('token'));
    } catch (_) { }
    return authed ? children : <Navigate to="/login" replace />;
  };

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Body /></PrivateRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="utilisateurs" element={<Utilisateurs />} />
            <Route path="depot" element={<Depot />} />
            <Route path="annuler" element={<Annuler />} />
            <Route path="historique" element={<Historique />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;