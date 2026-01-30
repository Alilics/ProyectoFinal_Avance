const express = require('express');
const jwt = require('jsonwebtoken');
const Note = require('../models/Note');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

/* CREATE (PROTEGIDO) */
router.post('/', auth, async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const note = await Note.create({ title, content, owner: req.usuario.id });
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

/* READ (PÚBLICO - incluye canEdit si viene token) */
router.get('/', async (req, res, next) => {
  try {
    let userId = null;
    const token = req.headers['authorization'];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // token inválido, ignoramos y devolvemos sin canEdit
      }
    }

    const notes = await Note.find().populate('owner', 'nombre email');

    const result = notes.map(n => ({
      id: n._id,
      title: n.title,
      content: n.content,
      owner: n.owner,
      canEdit: userId && n.owner && n.owner._id.toString() === userId
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/* UPDATE (PROTEGIDO - sólo propietario) */
router.put('/:id', auth, async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ mensaje: 'Nota no encontrada' });

    if (note.owner.toString() !== req.usuario.id) {
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

/* DELETE (PROTEGIDO - sólo propietario) */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ mensaje: 'Nota no encontrada' });

    // DEBUG: registrar usuario y propietario para depuración
    console.debug('[DELETE] usuario:', req.usuario && req.usuario.id, 'note.owner:', note.owner && note.owner.toString());

    if (note.owner.toString() !== req.usuario.id) {
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