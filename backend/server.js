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
const HOST = '0.0.0.0'; // Important pour Render

const app = express();

// ✅ Configuration CORS unique et propre
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173', // URL du frontend (Vercel ou local)
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ✅ Middleware de parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Vérification de la variable d'environnement MongoDB
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI n\'est pas défini dans les variables d\'environnement');
  process.exit(1);
}

// ✅ Connexion MongoDB
const client = new MongoClient(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

let db;
let isConnected = false;

// ✅ Route de santé
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mongodb: isConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ Route d'accueil (test rapide)
app.get('/', (req, res) => {
  res.json({
    message: 'API SenBank - Bienvenue 🚀',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/login, /register, /logout',
      users: '/users/*',
      transactions: '/transactions/*'
    }
  });
});

// ✅ Fonction de connexion à MongoDB et démarrage du serveur
async function connectToMongoDB() {
  try {
    console.log('🔄 Connexion à MongoDB...');
    await client.connect();

    // Vérification de la connexion
    await client.db('admin').command({ ping: 1 });
    db = client.db('senbank');
    isConnected = true;
    console.log('✅ Connecté à MongoDB');

    // Index TTL pour la collection token_blacklist
    try {
      const collections = await db.listCollections({ name: 'token_blacklist' }).toArray();
      if (collections.length > 0) {
        const indexes = await db.collection('token_blacklist').indexes();
        const ttlIndexExists = indexes.some(index => index.name === 'expiresAt_1');
        if (!ttlIndexExists) {
          await db.collection('token_blacklist').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
          console.log('✅ Index TTL créé pour token_blacklist');
        } else {
          console.log('ℹ️  Index TTL existe déjà pour token_blacklist');
        }
      }
    } catch (indexError) {
      console.error('⚠️  Erreur création index TTL token_blacklist:', indexError.message);
    }

    // Vérifier la clé JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET n\'est pas défini dans les variables d\'environnement');
      process.exit(1);
    }

    // ✅ Initialiser les middlewares et routes
    const { authMiddleware, agentMiddleware } = createAuthMiddlewares(db, jwtSecret);
    app.use('/', authRoutes(db, { authMiddleware, agentMiddleware }, jwtSecret));
    app.use('/users', userRoutes(db, { authMiddleware, agentMiddleware }));
    app.use('/transactions', transactionRoutes(db, { authMiddleware, agentMiddleware }));

    // ✅ Middlewares d'erreurs (à la fin)
    app.use(notFound);
    app.use(errorHandler);

    // ✅ Démarrage du serveur
    const server = app.listen(PORT, HOST, () => {
      console.log('='.repeat(60));
      console.log(`🚀 Serveur démarré sur http://${HOST}:${PORT}`);
      console.log(`🌐 URL publique: ${process.env.RENDER_EXTERNAL_URL || 'N/A'}`);
      console.log('='.repeat(60));
    });

    // ✅ Fermeture propre
    const gracefulShutdown = async (signal) => {
      console.log(`Signal ${signal} reçu, arrêt du serveur...`);
      server.close(async () => {
        await client.close();
        console.log('Connexion MongoDB fermée. Arrêt propre terminé.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    console.error('❌ Erreur de connexion à MongoDB:', err);
    isConnected = false;
    process.exit(1);
  }
}

// ✅ Gestion des erreurs globales
process.on('unhandledRejection', (reason) => console.error('Promesse rejetée non gérée:', reason));
process.on('uncaughtException', (error) => {
  console.error('Exception non capturée:', error);
  process.exit(1);
});

// ✅ Lancer la connexion
connectToMongoDB().catch(err => {
  console.error('❌ Échec du démarrage:', err);
  process.exit(1);
});
