const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Producto = sequelize.define('Producto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Código único del producto'
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Descripción del producto'
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Cantidad actual en stock'
  },
  unidad_medida: {
    type: DataTypes.STRING,
    field: 'unidad_medida',
    allowNull: false,
    comment: 'Unidad de medida (ej: Kg, Unidad)'
  },
  clasificacion: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Clasificación principal (ej: SOLDADURA)'
  },
  subclasificacion: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Subclasificación del producto'
  },
  ubicacion_estante: {
    type: DataTypes.STRING,
    field: 'ubicacion_estante',
    allowNull: true,
    comment: 'Ubicación en el almacén (ej: E01, E02, etc.)'
  },
  fecha_registro: {
    type: DataTypes.DATE,
    field: 'fecha_registro',
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha de registro o última actualización'
  }
}, {
  tableName: 'productos',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['codigo']
    },
    {
      fields: ['nombre']
    },
    {
      fields: ['clasificacion', 'subclasificacion']
    },
    {
      fields: ['ubicacion_estante']
    }
  ]
});

module.exports = Producto;
