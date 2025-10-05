// @ts-nocheck
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();
// Routes modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
// Middleware factory
const createAuthMiddlewares = require('./middleware/auth');
// Error middlewares
const { notFound, errorHandler } = require('./middleware/error');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// Connexion à MongoDB
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db('senbank');
    console.log('Connecté à MongoDB');
    try {
      await db.collection('token_blacklist').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    } catch (e) {
      console.error('Erreur création index TTL token_blacklist:', e);
    }
    // Initialiser les middlewares dépendants de la DB et monter les routes, puis démarrer le serveur
    const { authMiddleware, agentMiddleware } = createAuthMiddlewares(db, process.env.JWT_SECRET);
    const authRouter = authRoutes(db, { authMiddleware, agentMiddleware }, process.env.JWT_SECRET);
    const usersRouter = userRoutes(db, { authMiddleware, agentMiddleware });
    const transactionsRouter = transactionRoutes(db, { authMiddleware, agentMiddleware });
    app.use('/', authRouter);
    app.use('/users', usersRouter);
    app.use('/transactions', transactionsRouter);
    // Middlewares d'erreurs
    app.use(notFound);
    app.use(errorHandler);
    app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
  } catch (err) {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  }
}
connectToMongoDB();