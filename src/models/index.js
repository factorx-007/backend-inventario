const { sequelize } = require('../config/database');
const Producto = require('./Producto');
const Trabajador = require('./Trabajador');
const { PrestamoHerramienta, ItemPrestamo } = require('./PrestamoHerramienta');

// Establecer relaciones entre modelos
Trabajador.hasMany(PrestamoHerramienta, { foreignKey: 'trabajador_id' });
// PrestamoHerramienta.belongsTo(Trabajador, { foreignKey: 'trabajador_id' }); // Moved to PrestamoHerramienta.js

// Sincronizar modelos con la base de datos
const syncModels = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Modelos sincronizados correctamente con la base de datos');
    return true;
  } catch (error) {
    console.error('Error al sincronizar modelos:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  Producto,
  Trabajador,
  PrestamoHerramienta,
  ItemPrestamo,
  syncModels
};
