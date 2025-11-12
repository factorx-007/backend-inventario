const { Producto } = require('../models');
const { Op } = require('sequelize');

// Obtener todos los productos
const obtenerProductos = async (req, res, next) => {
  try {
    const { busqueda, clasificacion, subclasificacion, estante } = req.query;
    
    // Construir condiciones de búsqueda
    const whereClause = {};
    
    // Búsqueda por código o nombre
    if (busqueda) {
      whereClause[Op.or] = [
        { codigo: { [Op.iLike]: `%${busqueda}%` } },
        { nombre: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    // Filtros adicionales
    if (clasificacion) whereClause.clasificacion = clasificacion;
    if (subclasificacion) whereClause.subclasificacion = subclasificacion;
    if (estante) whereClause.ubicacion_estante = estante; // Corrected to snake_case
    
    const productos = await Producto.findAll({
      where: whereClause,
      order: [['nombre', 'ASC']]
    });
    
    res.json(productos);
  } catch (error) {
    next(error);
  }
};

// Obtener un producto por ID
const obtenerProductoPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);
    
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    res.json(producto);
  } catch (error) {
    next(error);
  }
};

// Crear un nuevo producto
const crearProducto = async (req, res, next) => {
  try {
    const { codigo, nombre, cantidad, unidadMedida, clasificacion, subclasificacion, ubicacionEstante } = req.body;
    
    // Verificar si ya existe un producto con el mismo código
    const productoExistente = await Producto.findOne({ where: { codigo } });
    if (productoExistente) {
      return res.status(400).json({ mensaje: 'Ya existe un producto con este código' });
    }
    
    const nuevoProducto = await Producto.create({
      codigo,
      nombre,
      cantidad: cantidad || 0,
      unidad_medida: unidadMedida, // Use unidad_medida to match model
      clasificacion,
      subclasificacion,
      ubicacion_estante: ubicacionEstante, // Use ubicacion_estante to match model
      fecha_registro: new Date() // Use fecha_registro to match model
    });
    
    res.status(201).json(nuevoProducto);
  } catch (error) {
    next(error);
  }
};

// Actualizar un producto existente
const actualizarProducto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { codigo, nombre, cantidad, unidadMedida, clasificacion, subclasificacion, ubicacionEstante } = req.body;
    
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    // Verificar si el código ya está en uso por otro producto
    if (codigo && codigo !== producto.codigo) {
      const codigoExistente = await Producto.findOne({ where: { codigo } });
      if (codigoExistente) {
        return res.status(400).json({ mensaje: 'Ya existe un producto con este código' });
      }
    }
    
    // Actualizar los campos
    await producto.update({
      codigo: codigo || producto.codigo,
      nombre: nombre || producto.nombre,
      cantidad: cantidad !== undefined ? cantidad : producto.cantidad,
      unidad_medida: unidadMedida || producto.unidad_medida, // Use unidad_medida to match model
      clasificacion: clasificacion || producto.clasificacion,
      subclasificacion: subclasificacion !== undefined ? subclasificacion : producto.subclasificacion,
      ubicacion_estante: ubicacionEstante !== undefined ? ubicacionEstante : producto.ubicacion_estante // Use ubicacion_estante to match model
    });
    
    res.json(producto);
  } catch (error) {
    next(error);
  }
};

// Eliminar un producto
const eliminarProducto = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    await producto.destroy();
    
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

// Actualizar el stock de un producto
const actualizarStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tipo, cantidad, motivo } = req.body; // tipo: 'entrada' o 'salida'
    
    if (!['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'Tipo de operación no válido. Use "entrada" o "salida"' });
    }
    
    if (typeof cantidad !== 'number' || cantidad <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser un número positivo' });
    }
    
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    
    // Verificar que no haya stock negativo
    if (tipo === 'salida' && producto.cantidad < cantidad) {
      return res.status(400).json({ 
        mensaje: 'Stock insuficiente', 
        stockDisponible: producto.cantidad,
        cantidadSolicitada: cantidad
      });
    }
    
    // Actualizar el stock
    const nuevaCantidad = tipo === 'entrada' 
      ? producto.cantidad + cantidad 
      : producto.cantidad - cantidad;
    
    await producto.update({ 
      cantidad: nuevaCantidad,
      fecha_registro: new Date() // Corrected to snake_case
    });
    
    // Aquí podrías registrar el movimiento en una tabla de historial
    
    res.json({
      mensaje: `Stock actualizado correctamente (${tipo} de ${cantidad} ${producto.unidad_medida})`, // Corrected to snake_case
      producto
    });
  } catch (error) {
    next(error);
  }
};

// Obtener productos por ubicación de estante
const obtenerProductosPorEstante = async (req, res, next) => {
  try {
    const { estante } = req.params;
    
    const productos = await Producto.findAll({
      where: { ubicacion_estante: estante }, // Corrected to snake_case
      order: [['nombre', 'ASC']]
    });
    
    if (productos.length === 0) {
      return res.status(404).json({ 
        mensaje: `No se encontraron productos en el estante ${estante}` 
      });
    }
    
    res.json(productos);
  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas de inventario
const obtenerEstadisticasInventario = async (req, res, next) => {
  try {
    // Contar productos por clasificación
    const productosPorClasificacion = await Producto.findAll({
      attributes: ['clasificacion', [sequelize.fn('COUNT', 'clasificacion'), 'cantidad']],
      group: ['clasificacion'],
      order: [[sequelize.fn('COUNT', 'clasificacion'), 'DESC']]
    });
    
    // Productos con stock bajo (menos de 5 unidades)
    const stockBajo = await Producto.findAll({
      where: {
        cantidad: {
          [Op.lt]: 5
        }
      },
      order: [['cantidad', 'ASC']],
      limit: 10
    });
    
    // Valor total del inventario (asumiendo un valor unitario, que deberías agregar al modelo si es necesario)
    const totalProductos = await Producto.count();
    const totalStock = await Producto.sum('cantidad');
    
    res.json({
      totalProductos,
      totalStock,
      productosPorClasificacion,
      stockBajo: {
        cantidad: stockBajo.length,
        productos: stockBajo
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerProductos,
  obtenerProductoPorId,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  actualizarStock,
  obtenerProductosPorEstante,
  obtenerEstadisticasInventario
};
