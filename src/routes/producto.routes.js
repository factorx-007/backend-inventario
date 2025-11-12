const express = require('express');
const router = express.Router();
const productoController = require('../controllers/producto.controller');
const { check } = require('express-validator');

// Middleware de validación
const validarCampos = require('../middlewares/validar-campos');

// Obtener todos los productos con filtros
router.get('/', [
  check('busqueda', 'El término de búsqueda debe ser una cadena de texto').optional().isString(),
  check('clasificacion', 'La clasificación debe ser una cadena de texto').optional().isString(),
  check('subclasificacion', 'La subclasificación debe ser una cadena de texto').optional().isString(),
  check('estante', 'El estante debe ser una cadena de texto (ej: E01)').optional().isString(),
  validarCampos
], productoController.obtenerProductos);

// Obtener un producto por ID
router.get('/:id', [
  check('id', 'El ID debe ser un número entero').isInt({ min: 1 }),
  validarCampos
], productoController.obtenerProductoPorId);

// Crear un nuevo producto
router.post('/', [
  check('codigo', 'El código es obligatorio').not().isEmpty(),
  check('nombre', 'El nombre es obligatorio').not().isEmpty(),
  check('cantidad', 'La cantidad debe ser un número entero no negativo').optional().isInt({ min: 0 }),
  check('unidadMedida', 'La unidad de medida es obligatoria').not().isEmpty(),
  check('clasificacion', 'La clasificación es obligatoria').not().isEmpty(),
  check('subclasificacion', 'La subclasificación es opcional').optional(),
  check('ubicacionEstante', 'La ubicación del estante es opcional').optional(),
  validarCampos
], productoController.crearProducto);

// Actualizar un producto existente
router.put('/:id', [
  check('id', 'El ID debe ser un número entero').isInt({ min: 1 }),
  check('codigo', 'El código es obligatorio').optional().not().isEmpty(),
  check('nombre', 'El nombre es obligatorio').optional().not().isEmpty(),
  check('cantidad', 'La cantidad debe ser un número entero no negativo').optional().isInt({ min: 0 }),
  check('unidadMedida', 'La unidad de medida es obligatoria').optional().not().isEmpty(),
  check('clasificacion', 'La clasificación es obligatoria').optional().not().isEmpty(),
  check('subclasificacion', 'La subclasificación es opcional').optional(),
  check('ubicacionEstante', 'La ubicación del estante es opcional').optional(),
  validarCampos
], productoController.actualizarProducto);

// Eliminar un producto
router.delete('/:id', [
  check('id', 'El ID debe ser un número entero').isInt({ min: 1 }),
  validarCampos
], productoController.eliminarProducto);

// Actualizar el stock de un producto (entrada/salida)
router.post('/:id/stock', [
  check('id', 'El ID debe ser un número entero').isInt({ min: 1 }),
  check('tipo', 'El tipo de operación es obligatorio (entrada/salida)').isIn(['entrada', 'salida']),
  check('cantidad', 'La cantidad es obligatoria y debe ser un número positivo').isFloat({ min: 0.01 }),
  check('motivo', 'El motivo es opcional').optional(),
  validarCampos
], productoController.actualizarStock);

// Obtener productos por ubicación de estante
router.get('/estante/:estante', [
  check('estante', 'El número de estante es obligatorio (ej: E01)').not().isEmpty(),
  validarCampos
], productoController.obtenerProductosPorEstante);

// Obtener estadísticas de inventario
router.get('/estadisticas/inventario', productoController.obtenerEstadisticasInventario);

module.exports = router;
