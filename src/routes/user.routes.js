const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const { validateUser } = require('../middlewares/validation.middleware');

const router = express.Router();

/* CREATE (PROTEGIDO - sólo Admin) */
router.post('/', authMiddleware, requireRole('Admin'), validateUser, async (req, res, next) => {
  try {
    const { nombre, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await User.create({
      nombre,
      email,
      password: hashedPassword,
      role: role || 'User'
    });

    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        role: usuario.role
      }
    });
  } catch (error) {
    next(error);
  }
});

/* READ (sólo Admin) */
router.get('/', authMiddleware, requireRole('Admin'), async (req, res, next) => {
  try {
    const usuarios = await User.find().select('-password');
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
});

/* UPDATE (PROTEGIDO - owner o Admin) */
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    // sólo el usuario mismo o un Admin puede actualizar
    if (req.usuario.id !== req.params.id && req.usuario.role !== 'Admin') {
      return res.status(403).json({ mensaje: 'Permiso insuficiente' });
    }
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    // si se intenta cambiar el rol y quien hace la petición no es admin, bloquearlo
    if (updates.role && req.usuario.role !== 'Admin') {
      delete updates.role;
    }
    const usuario = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(usuario);
  } catch (error) {
    next(error);
  }
});

/* DELETE (PROTEGIDO - sólo Admin) */
router.delete('/:id', authMiddleware, requireRole('Admin'), async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ mensaje: 'Usuario eliminado' });
  } catch (error) {
    next(error);
  }
});

/* REGISTER (PÚBLICO) */
router.post('/register', async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body;

    // Verificar si el email ya existe
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await User.create({
      nombre,
      email,
      password: hashedPassword
    });

    // Retornamos datos sin la contraseña
    res.status(201).json({
      mensaje: 'Cuenta creada correctamente',
      usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email }
    });
  } catch (error) {
    next(error);
  }
});

/* LOGIN */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
