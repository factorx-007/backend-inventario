const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Trabajador = sequelize.define('Trabajador', {
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
    comment: 'Código único del trabajador'
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nombre completo del trabajador'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Indica si el trabajador está activo en el sistema'
  },
  fecha_registro: {
    type: DataTypes.DATE,
    field: 'fecha_registro',
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha de registro del trabajador'
  }
}, {
  tableName: 'trabajadores',
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
      fields: ['activo']
    }
  ]
});

module.exports = Trabajador;
