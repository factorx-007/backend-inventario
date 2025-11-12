require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { testConnection } = require('./config/database');
const { syncModels } = require('./models');
const { PORT = 5000, NODE_ENV = 'development' } = process.env;

// Importar rutas
const productoRoutes = require('./routes/producto.routes');
const trabajadorRoutes = require('./routes/trabajador.routes');
const prestamoRoutes = require('./routes/prestamo.routes');

// Inicializar la aplicación Express
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Configurar logs en desarrollo
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Inicialización perezosa para entornos serverless (Vercel)
let initialized = false;
let initPromise = null;
const initialize = async () => {
  try {
    console.log('Iniciando inicialización...');
    // Probar conexión a la base de datos
    console.log('Probando conexión a la base de datos...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }
    console.log('Conexión a la base de datos exitosa');

    // Sincronizar modelos (sin forzar la recreación de tablas)
    console.log('Sincronizando modelos...');
    await syncModels(false);
    console.log('Modelos sincronizados correctamente');
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    throw error; // Re-lanzar el error para manejarlo en el middleware
  }
};

// Asegurar inicialización antes de manejar cualquier petición
app.use(async (req, res, next) => {
  try {
    console.log('Recibida petición a:', req.path);
    if (!initialized) {
      console.log('Inicialización pendiente, iniciando...');
      if (!initPromise) {
        console.log('Creando promesa de inicialización...');
        initPromise = initialize().catch(e => {
          console.error('Error en inicialización:', e);
          throw e;
        });
      }
      await initPromise;
      console.log('Inicialización completada con éxito');
      initialized = true;
    }
    next();
  } catch (err) {
    console.error('Error en middleware de inicialización:', err);
    next(err);
  }
});

// Rutas de la API
app.use('/api/productos', productoRoutes);
app.use('/api/trabajadores', trabajadorRoutes);
app.use('/api/prestamos', prestamoRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    message: 'API de Gestión de Inventario y Préstamos',
    status: 'En funcionamiento',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores 404
app.use((req, res, next) => {
  const error = new Error('Ruta no encontrada');
  error.status = 404;
  next(error);
});

// Manejador de errores global
app.use((error, req, res, next) => {
  console.error('Error en la aplicación:', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    originalUrl: req.originalUrl,
    method: req.method,
    headers: req.headers
  });
  
  const status = error.status || 500;
  const message = error.message || 'Error interno del servidor';
  
  // En producción, no exponer detalles del error
  const errorResponse = {
    error: {
      message: status === 500 ? 'Error interno del servidor' : message,
      status,
      timestamp: new Date().toISOString()
    }
  };

  // Solo incluir detalles adicionales en desarrollo
  if (NODE_ENV !== 'production') {
    errorResponse.error.details = {
      message: error.message,
      stack: error.stack,
      path: req.originalUrl
    };
  }
  
  res.status(status).json(errorResponse);
});

module.exports = app;
