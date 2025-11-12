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
  console.error('Error:', error);
  
  const status = error.status || 500;
  const message = error.message || 'Error interno del servidor';
  
  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      ...(NODE_ENV === 'development' && { stack: error.stack })
    }
  });
});

// Inicializar el servidor
const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    // Sincronizar modelos (sin forzar la recreación de tablas)
    await syncModels(false);

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`Servidor en ejecución en http://localhost:${PORT}`);
      console.log(`Entorno: ${NODE_ENV}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer();

// Manejo de cierre de la aplicación
process.on('SIGINT', async () => {
  console.log('\nCerrando conexiones...');
  const { sequelize } = require('./config/database');
  if (sequelize) {
    await sequelize.close();
    console.log('Conexión a la base de datos cerrada.');
  }
  console.log('Saliendo...');
  process.exit(0);
});

module.exports = app;
