require('dotenv').config();
const { Sequelize } = require('sequelize');

console.log('Probando conexión a la base de datos...');
console.log('Host:', process.env.DB_HOST);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);

// Configuración de la conexión
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 10000
    },
    logging: console.log,
    pool: {
      max: 1,
      min: 0,
      acquire: 10000,
      idle: 10000
    }
  }
);

// Función para probar la conexión
async function testConnection() {
  try {
    console.log('Intentando conectar a la base de datos...');
    await sequelize.authenticate();
    console.log('¡Conexión exitosa! La autenticación fue correcta.');
    
    // Probar una consulta simple
    console.log('Probando consulta a la base de datos...');
    const result = await sequelize.query('SELECT version();');
    console.log('Versión de PostgreSQL:', result[0][0].version);
    
    return true;
  } catch (error) {
    console.error('Error al conectar a la base de datos:');
    console.error('Código:', error.original?.code);
    console.error('Mensaje:', error.original?.message || error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    // Cerrar la conexión
    await sequelize.close();
  }
}

// Ejecutar la prueba
testConnection()
  .then(success => {
    console.log(success ? 'Prueba completada con éxito' : 'La prueba falló');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Error inesperado:', err);
    process.exit(1);
  });
