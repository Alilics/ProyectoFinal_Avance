const express = require('express');
const jwt = require('jsonwebtoken');
const Note = require('../models/Note');
const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');
const { validateNote, validateNoteQuery } = require('../middlewares/validation.middleware');

const router = express.Router();

/* CREATE (PROTEGIDO) */
router.post('/', authMiddleware, validateNote, async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const note = await Note.create({ title, content, owner: req.usuario.id });
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

/* READ (PÚBLICO - filtros y canEdit si viene token) */
router.get('/', validateNoteQuery, async (req, res, next) => {
  try {
    let userId = null;
    let userRole = null;
    const token = req.headers['authorization'];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        userRole = decoded.role;
      } catch (err) {
        // token inválido, ignoramos y devolvemos sin canEdit
      }
    }

    // Construir filtro a partir de query params
    let filter = {};
    if (req.query.owner) filter.owner = req.query.owner;
    if (req.query.title) filter.title = { $regex: req.query.title, $options: 'i' };

    // buscar por autor (nombre o email) si se proporciona
    if (req.query.author) {
      // cargamos usuarios cuyos nombres o emails coincidan
      const User = require('../models/User');
      const regex = new RegExp(req.query.author, 'i');
      const users = await User.find({ $or: [{ nombre: regex }, { email: regex }] }).select('_id');
      const ids = users.map(u => u._id);
      filter.owner = { $in: ids };
    }

    const notes = await Note.find(filter).populate('owner', 'nombre email');

    const result = notes.map(n => ({
      id: n._id,
      title: n.title,
      content: n.content,
      owner: n.owner,
      createdAt: n.createdAt,
      canEdit:
        userId &&
        (userRole === 'Admin' || (n.owner && n.owner._id.toString() === userId))
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/* UPDATE (PROTEGIDO - propietario o admin) */
router.put('/:id', authMiddleware, validateNote, async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ mensaje: 'Nota no encontrada' });

    if (
      note.owner.toString() !== req.usuario.id &&
      req.usuario.role !== 'Admin'
    ) {
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    note.title = req.body.title;
    note.content = req.body.content;
    await note.save();

    res.json(note);
  } catch (error) {
    next(error);
  }
});

/* DELETE (PROTEGIDO - propietario o admin) */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ mensaje: 'Nota no encontrada' });

    // DEBUG: registrar usuario y propietario para depuración
    console.debug('[DELETE] usuario:', req.usuario && req.usuario.id, 'role:', req.usuario && req.usuario.role, 'note.owner:', note.owner && note.owner.toString());

    if (
      note.owner.toString() !== req.usuario.id &&
      req.usuario.role !== 'Admin'
    ) {
      console.warn('[DELETE] intento de borrado no autorizado por usuario:', req.usuario && req.usuario.id);
      return res.status(403).json({ mensaje: 'No autorizado' });
    }

    // Usar método de borrado compatible con versiones recientes de Mongoose
    await Note.findByIdAndDelete(req.params.id);
    console.debug('[DELETE] nota eliminada:', req.params.id);
    res.json({ mensaje: 'Nota eliminada' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;