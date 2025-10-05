// @ts-nocheck
const express = require('express');
const createUserController = require('../controllers/userController');
const createPasswordController = require('../controllers/passwordController');

module.exports = function userRoutes(db, middlewares) {
  const router = express.Router();
  const { authMiddleware, agentMiddleware } = middlewares;
  const controller = createUserController(db);
  const pwdController = createPasswordController(db);

  // Endpoint : Création d'utilisateur
  router.post('/', controller.createUser);

  // Endpoint : Modification d'utilisateur
  router.put('/:id', authMiddleware, controller.updateUser);

  // Endpoint : Modifier mot de passe
  router.put('/:id/password', authMiddleware, pwdController.updatePassword);

  // Endpoint : Suppression d'utilisateur(s)
  router.delete('/', authMiddleware, agentMiddleware, controller.deleteUsers);

  // Endpoint : Lister les utilisateurs
  router.get('/', authMiddleware, agentMiddleware, controller.listUsers);

  // Endpoint : Bloquer/Débloquer utilisateur(s)
  router.patch('/block', authMiddleware, agentMiddleware, controller.blockUsers);

  return router;
}
