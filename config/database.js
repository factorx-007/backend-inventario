const { Sequelize } = require('sequelize');
const config = require('./config.json');

// Obtener la configuración según el entorno
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Crear la conexión a la base de datos
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: dbConfig.dialectOptions || {},
    pool: dbConfig.pool || {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Función para probar la conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection
};
