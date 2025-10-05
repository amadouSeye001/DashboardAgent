// @ts-nocheck
// 404 Not Found middleware
function notFound(req, res, next) {
  res.status(404).json({ error: 'Route non trouvée' });
}

// Centralized error handler
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Erreur serveur';
  if (process.env.NODE_ENV !== 'production') {
    console.error('Erreur:', err);
  }
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
