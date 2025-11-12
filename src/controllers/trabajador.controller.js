const { Trabajador, PrestamoHerramienta } = require('../models');
const { Op } = require('sequelize');

// Obtener todos los trabajadores
const obtenerTrabajadores = async (req, res, next) => {
  try {
    const { busqueda, activo } = req.query;
    
    const whereClause = {};
    
    // Filtrar por búsqueda (código o nombre)
    if (busqueda) {
      whereClause[Op.or] = [
        { codigo: { [Op.iLike]: `%${busqueda}%` } },
        { nombre: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    // Filtrar por estado activo/inactivo
    if (activo !== undefined) {
      whereClause.activo = activo === 'true';
    }
    
    const trabajadores = await Trabajador.findAll({
      where: whereClause,
      order: [['nombre', 'ASC']]
    });
    
    res.json(trabajadores);
  } catch (error) {
    next(error);
  }
};

// Obtener un trabajador por ID
const obtenerTrabajadorPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trabajador = await Trabajador.findByPk(id);
    
    if (!trabajador) {
      return res.status(404).json({ mensaje: 'Trabajador no encontrado' });
    }
    
    res.json(trabajador);
  } catch (error) {
    next(error);
  }
};

// Crear un nuevo trabajador
const crearTrabajador = async (req, res, next) => {
  try {
    const { codigo, nombre } = req.body;
    
    // Verificar si ya existe un trabajador con el mismo código
    const trabajadorExistente = await Trabajador.findOne({ where: { codigo } });
    if (trabajadorExistente) {
      return res.status(400).json({ mensaje: 'Ya existe un trabajador con este código' });
    }
    
    const nuevoTrabajador = await Trabajador.create({
      codigo,
      nombre,
      activo: true,
      fechaRegistro: new Date()
    });
    
    res.status(201).json(nuevoTrabajador);
  } catch (error) {
    next(error);
  }
};

// Actualizar un trabajador existente
const actualizarTrabajador = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, activo } = req.body;
    
    const trabajador = await Trabajador.findByPk(id);
    if (!trabajador) {
      return res.status(404).json({ mensaje: 'Trabajador no encontrado' });
    }
    
    // Verificar si el código ya está en uso por otro trabajador
    if (codigo && codigo !== trabajador.codigo) {
      const codigoExistente = await Trabajador.findOne({ where: { codigo } });
      if (codigoExistente) {
        return res.status(400).json({ mensaje: 'Ya existe un trabajador con este código' });
      }
    }
    
    // Actualizar los campos
    await trabajador.update({
      codigo: codigo || trabajador.codigo,
      nombre: nombre || trabajador.nombre,
      activo: activo !== undefined ? activo : trabajador.activo
    });
    
    res.json(trabajador);
  } catch (error) {
    next(error);
  }
};

// Eliminar un trabajador (marcar como inactivo en lugar de borrar)
const eliminarTrabajador = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const trabajador = await Trabajador.findByPk(id);
    if (!trabajador) {
      return res.status(404).json({ mensaje: 'Trabajador no encontrado' });
    }
    
    // Verificar si el trabajador tiene préstamos activos
    const prestamosActivos = await PrestamoHerramienta.count({
      where: {
        trabajadorId: id,
        estado: 'Abierto'
      }
    });
    
    if (prestamosActivos > 0) {
      return res.status(400).json({
        mensaje: 'No se puede desactivar el trabajador porque tiene préstamos activos',
        prestamosActivos
      });
    }
    
    // Marcar como inactivo en lugar de borrar
    await trabajador.update({ activo: false });
    
    res.json({ mensaje: 'Trabajador desactivado correctamente' });
  } catch (error) {
    next(error);
  }
};

// Obtener préstamos de un trabajador
const obtenerPrestamosTrabajador = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.query;
    
    const whereClause = { trabajadorId: id };
    
    // Filtrar por estado si se proporciona
    if (estado) {
      whereClause.estado = estado;
    }
    
    const prestamos = await PrestamoHerramienta.findAll({
      where: whereClause,
      include: [
        {
          model: Trabajador,
          attributes: ['id', 'codigo', 'nombre']
        },
        {
          model: ItemPrestamo,
          as: 'items',
          attributes: ['id', 'nombre', 'cantidadPrestada', 'cantidadDevuelta', 'comentarioDetalle']
        }
      ],
      order: [['fechaEntrega', 'DESC']]
    });
    
    res.json(prestamos);
  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas de trabajadores
const obtenerEstadisticasTrabajadores = async (req, res, next) => {
  try {
    const totalTrabajadores = await Trabajador.count();
    const trabajadoresActivos = await Trabajador.count({ where: { activo: true } });
    
    // Trabajadores con más préstamos
    const trabajadoresTopPrestamos = await Trabajador.findAll({
      attributes: [
        'id', 'codigo', 'nombre',
        [sequelize.fn('COUNT', sequelize.col('PrestamoHerramientas.id')), 'totalPrestamos']
      ],
      include: [
        {
          model: PrestamoHerramienta,
          attributes: [],
          required: true
        }
      ],
      group: ['Trabajador.id'],
      order: [[sequelize.literal('"totalPrestamos"'), 'DESC']],
      limit: 5
    });
    
    res.json({
      totalTrabajadores,
      trabajadoresActivos,
      trabajadoresInactivos: totalTrabajadores - trabajadoresActivos,
      trabajadoresTopPrestamos
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerTrabajadores,
  obtenerTrabajadorPorId,
  crearTrabajador,
  actualizarTrabajador,
  eliminarTrabajador,
  obtenerPrestamosTrabajador,
  obtenerEstadisticasTrabajadores
};
