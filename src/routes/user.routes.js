const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

/* CREATE (PROTEGIDO) */
router.post('/', auth, async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const usuario = await User.create({
      nombre,
      email,
      password: hashedPassword
    });

    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
});

/* READ (PÚBLICO) */
router.get('/', async (req, res, next) => {
  try {
    const usuarios = await User.find().select('-password');
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
});

/* UPDATE (PROTEGIDO) */
router.put('/:id', auth, async (req, res, next) => {
  try {
    const usuario = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(usuario);
  } catch (error) {
    next(error);
  }
});

/* DELETE (PROTEGIDO) */
router.delete('/:id', auth, async (req, res, next) => {
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
    res.status(201).json({ id: usuario._id, nombre: usuario.nombre, email: usuario.email });
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
      { id: usuario._id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
