const express = require('express');
const createTransactionController = require('../controllers/transactionController');

module.exports = function (db, middlewares) {
  const router = express.Router();
  const controller = createTransactionController(db);

  router.get('/', middlewares.authMiddleware, controller.listTransactions);
  router.post('/', middlewares.authMiddleware, controller.createTransaction);
  router.patch('/:id/cancel', middlewares.authMiddleware, controller.cancelTransaction);

  return router;
};