const { validationResult } = require('express-validator');

/**
 * Middleware que valida los campos de la petición según las reglas definidas
 * en las rutas. Si hay errores, devuelve una respuesta con los errores encontrados.
 */
const validarCampos = (req, res, next) => {
  // Obtener los errores de validación
  const errors = validationResult(req);
  
  // Si hay errores, devolverlos en la respuesta
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok: false,
      errors: errors.mapped()
    });
  }
  
  // Si no hay errores, continuar con el siguiente middleware
  next();
};

module.exports = validarCampos;
