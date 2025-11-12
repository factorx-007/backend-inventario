const { PrestamoHerramienta, ItemPrestamo, Trabajador } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database'); // Added sequelize import

// Crear un nuevo préstamo
const crearPrestamo = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { trabajadorId, items, observaciones } = req.body;
    
    // Verificar que el trabajador existe y está activo
    const trabajador = await Trabajador.findOne({
      where: { id: trabajadorId, activo: true },
      transaction
    });
    
    if (!trabajador) {
      await transaction.rollback();
      return res.status(404).json({ 
        mensaje: 'Trabajador no encontrado o inactivo' 
      });
    }
    
    // Validar que hay al menos un ítem
    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        mensaje: 'Debe incluir al menos un ítem en el préstamo' 
      });
    }
    
    // Crear el préstamo
    const nuevoPrestamo = await PrestamoHerramienta.create({
      trabajador_id: trabajadorId, // Usar snake_case para la columna de la base de datos
      fecha_entrega: new Date(),
      estado: 'pendiente', // Estado inicial válido según el enum
      observaciones: observaciones || '', // Asegurar que observaciones nunca sea null
    }, { transaction });
    
    // Crear los ítems del préstamo
    const itemsCreados = await Promise.all(
      items.map(item => 
        ItemPrestamo.create({
          nombre: item.nombre,
          cantidad_prestada: item.cantidadPrestada,
          comentario_detalle: item.comentarioDetalle || '',
          prestamo_id: nuevoPrestamo.id,
          cantidad_devuelta: 0 // Inicialmente no se ha devuelto nada
        }, { transaction })
      )
    );
    
    await transaction.commit();
    
    // Obtener el préstamo con sus relaciones para la respuesta
    const prestamoCompleto = await PrestamoHerramienta.findByPk(nuevoPrestamo.id, {
      include: [
        { model: Trabajador, attributes: ['id', 'codigo', 'nombre'], as: 'Trabajador' }, // Specify 'as' and attributes
        { model: ItemPrestamo, as: 'items' }
      ]
    });
    
    res.status(201).json(prestamoCompleto);
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Obtener todos los préstamos con filtros
const obtenerPrestamos = async (req, res, next) => {
  try {
    const { estado, trabajadorId, fechaInicio, fechaFin } = req.query;
    
    const whereClause = {};
    
    // Filtrar por estado
    if (estado) {
      whereClause.estado = estado;
    }
    
    // Filtrar por trabajador
    if (trabajadorId) {
      whereClause.trabajadorId = trabajadorId;
    }
    
    // Filtrar por rango de fechas
    if (fechaInicio || fechaFin) {
      whereClause.fecha_entrega = {};
      
      if (fechaInicio) {
        whereClause.fecha_entrega[Op.gte] = new Date(fechaInicio);
      }
      
      if (fechaFin) {
        // Añadir un día completo para incluir la fecha de fin
        const fechaFinObj = new Date(fechaFin);
        fechaFinObj.setDate(fechaFinObj.getDate() + 1);
        whereClause.fecha_entrega[Op.lt] = fechaFinObj;
      }
    }
    
    const prestamos = await PrestamoHerramienta.findAll({
      where: whereClause,
      include: [
        { 
          model: Trabajador, 
          attributes: ['id', 'codigo', 'nombre'],
          where: { activo: true },
          required: true
        },
        { 
          model: ItemPrestamo, 
          as: 'items',
          attributes: [
            'id',
            'nombre',
            ['cantidad_prestada', 'cantidadPrestada'], // Alias to camelCase
            ['cantidad_devuelta', 'cantidadDevuelta'], // Alias to camelCase
            ['comentario_detalle', 'comentarioDetalle'], // Alias to camelCase
          ]
        }
      ],
      order: [['fecha_entrega', 'DESC']]
    });
    
    res.json(prestamos);
  } catch (error) {
    next(error);
  }
};

// Obtener un préstamo por ID
const obtenerPrestamoPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const prestamo = await PrestamoHerramienta.findByPk(id, {
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
      ]
    });
    
    if (!prestamo) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
    }
    
    res.json(prestamo);
  } catch (error) {
    next(error);
  }
};

// Actualizar la devolución de un préstamo
const actualizarDevolucion = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { items, cerrarPrestamo } = req.body;
    
    // Obtener el préstamo con sus ítems
    const prestamo = await PrestamoHerramienta.findByPk(id, {
      include: [
        { model: ItemPrestamo, as: 'items' },
        { model: Trabajador, attributes: ['id', 'codigo', 'nombre'] }
      ],
      transaction
    });
    
    if (!prestamo) {
      await transaction.rollback();
      return res.status(404).json({ mensaje: 'Préstamo no encontrado' });
    }
    
    // Verificar que el préstamo no esté ya cerrado
    if (prestamo.estado === 'Cerrado') {
      await transaction.rollback();
      return res.status(400).json({ mensaje: 'El préstamo ya está cerrado' });
    }
    
    // Validar los ítems de devolución
    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        mensaje: 'Debe incluir al menos un ítem en la devolución' 
      });
    }
    
    // Actualizar las cantidades devueltas
    for (const itemDevuelto of items) {
      const itemPrestamo = prestamo.items.find(i => i.id === itemDevuelto.id);
      
      if (!itemPrestamo) {
        await transaction.rollback();
        return res.status(400).json({ 
          mensaje: `El ítem con ID ${itemDevuelto.id} no pertenece a este préstamo` 
        });
      }
      
      const nuevaCantidadDevuelta = itemDevuelto.cantidadDevuelta;
      
      // Validar que la cantidad devuelta no sea mayor a la prestada
      if (nuevaCantidadDevuelta > itemPrestamo.cantidadPrestada) {
        await transaction.rollback();
        return res.status(400).json({ 
          mensaje: `La cantidad devuelta no puede ser mayor a la prestada para el ítem ${itemPrestamo.nombre}`
        });
      }
      
      // Actualizar la cantidad devuelta
      await ItemPrestamo.update(
        { cantidadDevuelta: nuevaCantidadDevuelta },
        { 
          where: { id: itemDevuelto.id },
          transaction
        }
      );
    }
    
    // Si se solicita cerrar el préstamo, verificar que todos los ítems estén completos
    if (cerrarPrestamo) {
      const prestamoActualizado = await PrestamoHerramienta.findByPk(id, {
        include: [
          { model: ItemPrestamo, as: 'items' }
        ],
        transaction
      });
      
      // Verificar que todos los ítems tengan devolución completa
      const todosCompletos = prestamoActualizado.items.every(
        item => item.cantidadDevuelta === item.cantidadPrestada
      );
      
      if (!todosCompletos) {
        await transaction.rollback();
        return res.status(400).json({ 
          mensaje: 'No se puede cerrar el préstamo porque hay ítems pendientes de devolver',
          itemsPendientes: prestamoActualizado.items.filter(
            item => item.cantidadDevuelta < item.cantidadPrestada
          ).map(item => ({
            id: item.id,
            nombre: item.nombre,
            pendiente: item.cantidadPrestada - item.cantidadDevuelta
          }))
        });
      }
      
      // Cerrar el préstamo
      await PrestamoHerramienta.update(
        { 
          estado: 'completado',
          fecha_devolucion_final: new Date()
        },
        { 
          where: { id },
          transaction
        }
      );
    }
    
    await transaction.commit();
    
    // Obtener el préstamo actualizado para la respuesta
    const prestamoActualizado = await PrestamoHerramienta.findByPk(id, {
      include: [
        { model: Trabajador, attributes: ['id', 'codigo', 'nombre'] },
        { model: ItemPrestamo, as: 'items' }
      ]
    });
    
    res.json({
      mensaje: cerrarPrestamo 
        ? 'Préstamo cerrado correctamente' 
        : 'Devolución registrada correctamente',
      prestamo: prestamoActualizado
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Obtener reporte de morosos
const obtenerReporteMorosos = async (req, res, next) => {
  try {
    // Obtener préstamos pendientes o en progreso con devoluciones pendientes
    const prestamosPendientes = await PrestamoHerramienta.findAll({
      where: { 
        estado: ['pendiente', 'en_progreso']
      },
      include: [
        { 
          model: Trabajador, 
          attributes: ['id', 'codigo', 'nombre'],
          where: { activo: true },
          required: true
        },
        { 
          model: ItemPrestamo, 
          as: 'items',
          attributes: ['id', 'nombre', 'cantidad_prestada', 'cantidad_devuelta', 'comentario_detalle'],
          where: {
            cantidad_devuelta: {
              [Op.lt]: sequelize.col('items.cantidad_prestada')
            }
          },
          required: true
        }
      ],
      order: [
        [Trabajador, 'nombre', 'ASC'],
        ['fecha_entrega', 'ASC']
      ]
    });
    
    // Formatear la respuesta para agrupar por trabajador
    const reporte = prestamosPendientes.reduce((acc, prestamo) => {
      // Acceder al trabajador a través del alias correcto
      const trabajador = prestamo.Trabajador || prestamo.trabajador;
      if (!trabajador) {
        console.warn('Préstamo sin trabajador asociado:', prestamo.id);
        return acc;
      }
      
      const trabajadorId = trabajador.id;
      
      // Filtrar solo los ítems pendientes
      const itemsPendientes = (prestamo.items || [])
        .filter(item => item.cantidad_devuelta < item.cantidad_prestada)
        .map(item => ({
          id: item.id,
          nombre: item.nombre,
          cantidadPrestada: item.cantidad_prestada,
          cantidadDevuelta: item.cantidad_devuelta,
          pendiente: item.cantidad_prestada - item.cantidad_devuelta,
          comentarioDetalle: item.comentario_detalle,
          fechaPrestamo: prestamo.fecha_entrega
        }));
      
      // Si ya existe el trabajador, agregar los ítems
      const trabajadorExistente = acc.find(t => t.id === trabajadorId);
      
      if (trabajadorExistente) {
        trabajadorExistente.itemsPendientes.push(...itemsPendientes);
        trabajadorExistente.totalPendiente += itemsPendientes.reduce(
          (sum, item) => sum + item.pendiente, 0
        );
      } else {
        acc.push({
          id: trabajadorId,
          trabajador: {
            id: trabajador.id,
            codigo: trabajador.codigo,
            nombre: trabajador.nombre
          },
          itemsPendientes,
          totalPendiente: itemsPendientes.reduce((sum, item) => sum + item.pendiente, 0),
          fechaPrestamoMasAntiguo: prestamo.fechaEntrega
        });
      }
      
      return acc;
    }, []);
    
    res.json(reporte);
  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas de préstamos
const obtenerEstadisticasPrestamos = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const whereClause = {};
    
    // Filtrar por rango de fechas si se proporciona
    if (fechaInicio || fechaFin) {
      whereClause.fechaEntrega = {};
      
      if (fechaInicio) {
        whereClause.fechaEntrega[Op.gte] = new Date(fechaInicio);
      }
      
      if (fechaFin) {
        const fechaFinObj = new Date(fechaFin);
        fechaFinObj.setDate(fechaFinObj.getDate() + 1);
        whereClause.fechaEntrega[Op.lt] = fechaFinObj;
      }
    }
    
    // Contar préstamos por estado
    const conteoPorEstado = await PrestamoHerramienta.findAll({
      attributes: [
        'estado',
        [sequelize.fn('COUNT', 'id'), 'total']
      ],
      where: whereClause,
      group: ['estado']
    });
    
    // Préstamos abiertos más antiguos
    const prestamosAbiertos = await PrestamoHerramienta.findAll({
      where: { 
        ...whereClause,
        estado: 'Abierto' 
      },
      include: [
        { 
          model: Trabajador, 
          attributes: ['id', 'codigo', 'nombre'] 
        }
      ],
      order: [['fechaEntrega', 'ASC']],
      limit: 5
    });
    
    // Total de ítems prestados
    const totalItemsPrestados = await ItemPrestamo.sum('cantidadPrestada', {
      include: [
        {
          model: PrestamoHerramienta,
          as: 'prestamo',
          where: whereClause,
          required: true
        }
      ]
    }) || 0;
    
    // Total de ítems devueltos
    const totalItemsDevueltos = await ItemPrestamo.sum('cantidadDevuelta', {
      include: [
        {
          model: PrestamoHerramienta,
          as: 'prestamo',
          where: whereClause,
          required: true
        }
      ]
    }) || 0;
    
    res.json({
      conteoPorEstado,
      prestamosAbiertos: {
        total: await PrestamoHerramienta.count({ 
          where: { ...whereClause, estado: 'Abierto' } 
        }),
        detalles: prestamosAbiertos
      },
      totalItems: {
        prestados: totalItemsPrestados,
        devueltos: totalItemsDevueltos,
        pendientes: totalItemsPrestados - totalItemsDevueltos
      },
      rangoFechas: {
        fechaInicio,
        fechaFin
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearPrestamo,
  obtenerPrestamos,
  obtenerPrestamoPorId,
  actualizarDevolucion,
  obtenerReporteMorosos,
  obtenerEstadisticasPrestamos
};
