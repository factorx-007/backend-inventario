const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Trabajador = require('./Trabajador'); // Added import for Trabajador

// Modelo para los ítems del préstamo
const ItemPrestamo = sequelize.define('ItemPrestamo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nombre genérico de la herramienta (ej: Llave Mixta)'
  },
  cantidad_prestada: {
    type: DataTypes.INTEGER,
    field: 'cantidad_prestada',
    allowNull: false,
    comment: 'Cantidad que se prestó inicialmente'
  },
  cantidad_devuelta: {
    type: DataTypes.INTEGER,
    field: 'cantidad_devuelta',
    allowNull: false,
    defaultValue: 0,
    comment: 'Cantidad que se ha devuelto hasta el momento'
  },
  comentario_detalle: {
    type: DataTypes.TEXT,
    field: 'comentario_detalle',
    allowNull: false,
    comment: 'Detalles específicos de la herramienta (ej: Llave mixta 30mm)'
  },
  prestamo_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'prestamos_herramientas',
      key: 'id'
    }
  }
}, {
  tableName: 'items_prestamo',
  timestamps: false
});

// Modelo principal para los préstamos
const PrestamoHerramienta = sequelize.define('PrestamoHerramienta', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  fecha_entrega: {
    type: DataTypes.DATE,
    field: 'fecha_entrega',
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha y hora en que se realiza el préstamo'
  },
  fecha_devolucion_final: {
    type: DataTypes.DATE,
    field: 'fecha_devolucion_final',
    allowNull: true,
    comment: 'Fecha y hora en que se completó la devolución de todos los ítems'
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'en_progreso', 'completado', 'atrasado'),
    allowNull: false,
    defaultValue: 'pendiente',
    comment: 'Estado actual del préstamo'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observaciones adicionales sobre el préstamo'
  },
  trabajador_id: {
    type: DataTypes.INTEGER,
    field: 'trabajador_id', // Explicitly define field to avoid potential duplication in RETURNING clause
    allowNull: false,
    references: {
      model: 'trabajadores',
      key: 'id'
    }
  }
}, {
  tableName: 'prestamos_herramientas',
  timestamps: false,
  indexes: [
    {
      fields: ['trabajador_id']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['fecha_entrega']
    }
  ]
});

// Relaciones
PrestamoHerramienta.hasMany(ItemPrestamo, { foreignKey: 'prestamo_id', as: 'items' });
ItemPrestamo.belongsTo(PrestamoHerramienta, { foreignKey: 'prestamo_id' });
PrestamoHerramienta.belongsTo(Trabajador, { foreignKey: 'trabajador_id' }); // Re-added explicit association

// Método para verificar si un préstamo puede ser cerrado
PrestamoHerramienta.prototype.puedeCerrar = function() {
  // Un préstamo puede cerrarse si todos los ítems tienen devoluciones completas
  if (this.estado === 'completado') {
    return false; // Ya está cerrado
  }
  
  // Verificar si todos los ítems tienen devolución completa
  return this.items.every(item => 
    item.cantidad_devuelta >= item.cantidad_prestada
  );
};

module.exports = {
  PrestamoHerramienta,
  ItemPrestamo
};
