const { body, validationResult, query } = require('express-validator');

// validaciones para notas
const validateNote = [
  body('title').isString().isLength({ min: 1 }).withMessage('El título es obligatorio'),
  body('content').isString().isLength({ min: 1 }).withMessage('El contenido es obligatorio'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }
];

// validaciones para usuarios (registro/creación)
const validateUser = [
  body('nombre').isString().isLength({ min: 1 }).withMessage('Nombre requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }
];

// validaciones para filtros de consulta de notas
const validateNoteQuery = [
  query('title').optional().isString().withMessage('title debe ser string'),
  query('owner').optional().isMongoId().withMessage('owner debe ser un id válido'),
  query('author').optional().isString().withMessage('author debe ser string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateNote,
  validateUser,
  validateNoteQuery
};
