// Configurar manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('=== INICIO DE LA APLICACIÓN ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Directorio actual:', process.cwd());
console.log('Versión de Node.js:', process.version);

// Cargar variables de entorno
try {
  console.log('Cargando variables de entorno...');
  require('dotenv').config();
  console.log('Variables de entorno cargadas correctamente');
} catch (error) {
  console.error('Error al cargar las variables de entorno:', error);
  process.exit(1);
}

// Verificar variables de entorno críticas
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => {
  const exists = !!process.env[envVar];
  console.log(`Variable ${envVar}: ${exists ? '✅' : '❌ No encontrada'}`);
  return !exists;
});

if (missingEnvVars.length > 0) {
  console.error('ERROR: Faltan variables de entorno requeridas:', missingEnvVars.join(', '));
  console.log('Asegúrate de configurar estas variables en la configuración de Render');
  process.exit(1);
}

console.log('Inicializando dependencias...');

try {
  console.log('Cargando módulos...');
  const express = require('express');
  const morgan = require('morgan');
  const cors = require('cors');
  const { testConnection } = require('./config/database');
  const { syncModels } = require('./models');
  console.log('Módulos cargados correctamente');
  
  // Inicializar la aplicación Express
  const app = express();
  
  // Configuración básica
  const { PORT = 5000, NODE_ENV = 'development' } = process.env;
  
  // Middlewares
  console.log('Configurando middlewares...');
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  
  if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
    console.log('Modo desarrollo: Morgan habilitado');
  }
  
  // Inicialización perezosa para entornos serverless
  let initialized = false;
  let initPromise = null;
  
  const initialize = async () => {
    if (initialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        console.log('Inicializando base de datos...');
        await testConnection();
        console.log('Conexión a la base de datos establecida correctamente');
        
        console.log('Sincronizando modelos...');
        await syncModels();
        console.log('Modelos sincronizados correctamente');
        
        initialized = true;
        console.log('Aplicación inicializada correctamente');
      } catch (error) {
        console.error('Error durante la inicialización:', error);
        throw error;
      }
    })();

    return initPromise;
  };
  
  // Asegurar inicialización antes de manejar cualquier petición
  app.use(async (req, res, next) => {
    try {
      console.log('Recibida petición a:', req.path);
      await initialize();
      next();
    } catch (error) {
      console.error('Error en el middleware de inicialización:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Error al inicializar la aplicación',
        error: NODE_ENV === 'development' ? error.message : {}
      });
    }
  });

  // Ruta de salud
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      message: 'Servidor funcionando correctamente',
      environment: NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });
  
  // Ruta raíz
  app.get('/', (req, res) => {
    res.json({
      message: 'API de Gestión de Inventario y Préstamos',
      status: 'En funcionamiento',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      documentation: `${req.protocol}://${req.get('host')}/api-docs`
    });
  });
  
  // Importar rutas
  console.log('Importando rutas...');
  const productoRoutes = require('./routes/producto.routes');
  const trabajadorRoutes = require('./routes/trabajador.routes');
  const prestamoRoutes = require('./routes/prestamo.routes');
  
  // Usar rutas
  app.use('/api/productos', productoRoutes);
  app.use('/api/trabajadores', trabajadorRoutes);
  app.use('/api/prestamos', prestamoRoutes);
  
  // Manejador de rutas no encontradas
  app.use((req, res) => {
    res.status(404).json({ 
      status: 'error',
      message: 'Ruta no encontrada',
      path: req.path,
      method: req.method
    });
  });
  
  // Manejador de errores global
  app.use((err, req, res, next) => {
    console.error('Error en la aplicación:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
    
    const status = err.status || 500;
    const message = status === 500 ? 'Error interno del servidor' : err.message;
    
    res.status(status).json({
      status: 'error',
      message,
      ...(NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    });
  });
  
  // Iniciar el servidor
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`🔍 Ruta de salud: http://localhost:${PORT}/health`);
    console.log('📊 Rutas disponibles:');
    console.log(`   - GET  /`);
    console.log(`   - GET  /health`);
    console.log(`   - GET  /api/productos`);
    console.log(`   - GET  /api/trabajadores`);
    console.log(`   - GET  /api/prestamos`);
    console.log(`\n🔧 Entorno: ${NODE_ENV}`);
    console.log(`🔄 Proceso ID: ${process.pid}`);
  });
  
  // Manejo de errores del servidor
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
    } else {
      console.error('❌ Error en el servidor:', error);
    }
    process.exit(1);
  });
  
  // Manejo de señales de terminación
  const shutdown = async () => {
    console.log('\n🔽 Recibida señal de terminación. Cerrando servidor...');
    
    try {
      await new Promise((resolve) => server.close(resolve));
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error al cerrar el servidor:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  
} catch (error) {
  console.error('❌ Error durante la inicialización:', error);
  process.exit(1);
}
