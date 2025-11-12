const express = require('express');
const router = express.Router();
const prestamoController = require('../controllers/prestamo.controller');
const { check, body } = require('express-validator');

// Middleware de validación
const validarCampos = require('../middlewares/validar-campos');

// Crear un nuevo préstamo
router.post('/', [
  check('trabajadorId', 'El ID del trabajador es obligatorio').isInt({ min: 1 }),
  check('items', 'Debe proporcionar al menos un ítem para el préstamo').isArray({ min: 1 }),
  check('items.*.nombre', 'El nombre del ítem es obligatorio').not().isEmpty(),
  check('items.*.cantidadPrestada', 'La cantidad prestada debe ser un número entero positivo').isInt({ min: 1 }),
  check('items.*.comentarioDetalle', 'El detalle del ítem es obligatorio').not().isEmpty(),
  check('observaciones', 'Las observaciones son opcionales').optional(),
  validarCampos
], prestamoController.crearPrestamo);

// Obtener todos los préstamos con filtros
router.get('/', [
  check('estado', 'El estado debe ser Abierto o Cerrado').optional().isIn(['Abierto', 'Cerrado']),
  check('trabajadorId', 'El ID del trabajador debe ser un número entero').optional().isInt({ min: 1 }),
  check('fechaInicio', 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)').optional().isISO8601(),
  check('fechaFin', 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)').optional().isISO8601(),
  validarCampos
], prestamoController.obtenerPrestamos);

// Obtener un préstamo por ID
router.get('/:id', [
  check('id', 'El ID del préstamo debe ser un número entero').isInt({ min: 1 }),
  validarCampos
], prestamoController.obtenerPrestamoPorId);

// Actualizar la devolución de un préstamo
router.put('/:id/devolucion', [
  check('id', 'El ID del préstamo debe ser un número entero').isInt({ min: 1 }),
  check('items', 'Debe proporcionar los ítems a actualizar').isArray({ min: 1 }),
  check('items.*.id', 'El ID del ítem es obligatorio').isInt({ min: 1 }),
  check('items.*.cantidadDevuelta', 'La cantidad devuelta debe ser un número entero no negativo')
    .isInt({ min: 0 }),
  check('cerrarPrestamo', 'El campo cerrarPrestamo debe ser un booleano').optional().isBoolean(),
  validarCampos
], prestamoController.actualizarDevolucion);

// Obtener reporte de morosos
router.get('/reportes/morosos', prestamoController.obtenerReporteMorosos);

// Obtener estadísticas de préstamos
router.get('/estadisticas/prestamos', [
  check('fechaInicio', 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)').optional().isISO8601(),
  check('fechaFin', 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)').optional().isISO8601(),
  validarCampos
], prestamoController.obtenerEstadisticasPrestamos);

module.exports = router;
