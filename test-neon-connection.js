require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function testConnection() {
  try {
    console.log('Conectando a la base de datos NeonDB...');
    console.log('URL de conexión:', process.env.DATABASE_URL.replace(/:([^:]*?)@/, ':***@'));
    
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('Ejecutando consulta de prueba...');
    const result = await sql`SELECT version()`;
    
    console.log('¡Conexión exitosa!');
    console.log('Versión de PostgreSQL:', result[0].version);
    
    return true;
  } catch (error) {
    console.error('Error al conectar a la base de datos:');
    console.error(error);
    return false;
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
