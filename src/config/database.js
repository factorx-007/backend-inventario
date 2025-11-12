require('dotenv').config();
const { Sequelize } = require('sequelize');

// Configuración de la conexión a la base de datos NeonDB
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    statement_timeout: 10000,
    idle_in_transaction_session_timeout: 10000,
    // Configuración específica para NeonDB
    connection: {
      options: `-c search_path=public`,
      application_name: 'inventario-app'
    }
  },
  // Configuración del pool de conexiones
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 5,
    min: parseInt(process.env.DB_POOL_MIN) || 0,
    acquire: parseInt(process.env.DB_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_IDLE) || 10000
  },
  // Configuración de los modelos
  define: {
    timestamps: false,
    freezeTableName: true,
    underscored: true
  },
  // Logging solo en desarrollo
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  // Configuración de reintentos
  retry: {
    max: 3,
    timeout: 30000
  }
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');
    return true;
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection
};
