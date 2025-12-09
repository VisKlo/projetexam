const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const pool = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "http://localhost:5000", "http://localhost:3000", "http://127.0.0.1:5000", "http://127.0.0.1:3000"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
};

app.use(cors(corsOptions));

const path = require('path');
const fs = require('fs');
const uploadsPath = path.join(__dirname, 'uploads');
const uploadsImagesPath = path.join(uploadsPath, 'images');
const uploadsVideosPath = path.join(uploadsPath, 'videos');

if (!fs.existsSync(uploadsImagesPath)) {
  fs.mkdirSync(uploadsImagesPath, { recursive: true });
}
if (!fs.existsSync(uploadsVideosPath)) {
  fs.mkdirSync(uploadsVideosPath, { recursive: true });
}

app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

const multipartParser = require('./middleware/multipartParser');
app.use(multipartParser);

app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', async (req, res) => {
  try {
    await pool.getConnection();
    res.json({ 
      status: 'OK', 
      message: 'API is running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    method: req.method,
    path: req.path,
    availableRoutes: [
      'GET /api/health',
      'GET /api/products',
      'GET /api/categories',
      'POST /api/auth/login',
      'POST /api/auth/register'
    ]
  });
});

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS: Origin not allowed',
      message: 'Cette origine n\'est pas autorisée à accéder à l\'API'
    });
  }

  res.status(err.status || 500).json({ 
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connexion à la base de données MySQL réussie');
    connection.release();
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Fichiers statiques servis depuis: ${uploadsPath}`);
  console.log(`🖼️  Images accessibles via: http://localhost:${PORT}/uploads/images/`);
});

module.exports = app;

