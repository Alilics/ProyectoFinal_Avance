const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');

const router = express.Router();

// iniciar flujo google
router.get('/google', (req, res, next) => {
  if (!passport._strategy('google')) {
    return res.status(500).json({ error: true, mensaje: 'Google OAuth no configurado' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// callback
router.get('/google/callback', (req, res, next) => {
  if (!passport._strategy('google')) {
    return res.status(500).json({ error: true, mensaje: 'Google OAuth no configurado' });
  }
  passport.authenticate('google', { session: false, failureRedirect: '/login' })(req, res, next);
},
  (req, res) => {
    // usuario autenticado por passport en req.user
    const user = req.user;
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    // aquí podríamos redirigir al cliente con el token en query o cookie
    res.redirect(`/main?token=${token}`);
  }
);

module.exports = router;