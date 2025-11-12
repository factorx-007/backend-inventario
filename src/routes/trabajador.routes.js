const express = require('express');
const router = express.Router();
const trabajadorController = require('../controllers/trabajador.controller');
const { check } = require('express-validator');

// Middleware de validación
const validarCampos = require('../middlewares/validar-campos');

// Obtener todos los trabajadores con filtros
router.get('/', [
  check('busqueda', 'El término de búsqueda debe ser una cadena de texto').optional().isString(),
  check('activo', 'El filtro de activo debe ser true o false').optional().isBoolean(),
  validarCampos
], trabajadorController.obtenerTrabajadores);

// Obtener un trabajador por ID
router.get('/:id', [
  check('id', 'El ID debe ser un número entero').isInt({ min: 1 }),
  validarCampos
], trabajadorController.obtenerTrabajadorPorId);

// Crear un nuevo trabajador
router.post('/', [
  check('codigo', 'El código es obligatorio').not().isEmpty(),
  check('nombre', 'El nombre es obligatorio').not().isEmpty(),
  validarCampos
], trabajadorController.crearTrabajador);

// Actualizar un trabajador existente
router.put('/:id', [
  check('id', 'El ID debe ser un número entero').isInt({ min: 1 }),
  check('codigo', 'El código es obligatorio').optional().not().isEmpty(),
  check('nombre', 'El nombre es obligatorio').optional().not().isEmpty(),
  check('activo', 'El estado activo debe ser true o false').optional().isBoolean(),
  validarCampos
], trabajadorController.actualizarTrabajador);

// Eliminar (desactivar) un trabajador
router.delete('/:id', [
  check('id', 'El ID debe ser un número entero').isInt({ min: 1 }),
  validarCampos
], trabajadorController.eliminarTrabajador);

// Obtener préstamos de un trabajador
router.get('/:id/prestamos', [
  check('id', 'El ID debe ser un número entero').isInt({ min: 1 }),
  check('estado', 'El estado debe ser Abierto o Cerrado').optional().isIn(['Abierto', 'Cerrado']),
  validarCampos
], trabajadorController.obtenerPrestamosTrabajador);

// Obtener estadísticas de trabajadores
router.get('/estadisticas/trabajadores', trabajadorController.obtenerEstadisticasTrabajadores);

module.exports = router;
