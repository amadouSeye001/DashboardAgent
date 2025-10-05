// @ts-nocheck
const express = require('express');
const createAuthController = require('../controllers/authController');

module.exports = function authRoutes(db, middlewares, jwtSecret) {
  const router = express.Router();
  const { authMiddleware, agentMiddleware } = middlewares;
  const controller = createAuthController(db, jwtSecret);

  // Endpoint : Connexion
  router.post('/connexion', controller.connexion);

  // Endpoint : Déconnexion agent avec révocation du token
  router.post('/agents/deconnexion', authMiddleware, agentMiddleware, controller.agentLogout);

  // Endpoint : Déconnexion (côté client)
  // router.post('/deconnexion', authMiddleware, controller.clientLogout);

  return router;
}
