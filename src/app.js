require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
require('./config/passport');

// passport needs initialization middleware for strategies to work



const conectarDB = require('./config/db');
const userRoutes = require('./routes/user.routes');
const noteRoutes = require('./routes/note.routes');
const errorHandler = require('./middlewares/error.middleware');

const app = express();
const path = require('path');

// Conectar BD
conectarDB();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Middleware de passport
app.use(passport.initialize());

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/auth', require('./routes/oauth.routes'));

// archivos estáticos (incluye index.html que contiene la aplicación React)
app.use(express.static(path.join(__dirname, '../frontend')));

// redireccionar la raíz a la versión clásica de login para que el servidor
// arranque mostrando login.html en lugar de index.html cuando React está comentado
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// también redirigir /main a /main.html para evitar que la página de redirección
// (index.html) se sirva en caso de escribir la ruta manualmente.
// Si vienen con query string (e.g. ?token=...), se conserva para que el
// cliente pueda leer el token tras el flujo OAuth.
app.get('/main', (req, res) => {
  const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  res.redirect('/main.html' + qs);
});

// servir el SPA para cualquier ruta no API, pero permitir que el login clásico
// sea accesible cuando se solicite. el middleware static ya maneja archivos como
// `/login.html`, sin embargo la captura global podía interceptar la petición cuando
// venía con query string o se generaba desde el mismo script.
app.use((req, res, next) => {
  // saltar rutas API y auth como antes
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) return next();
  // si el usuario pidió explícitamente login.html (con o sin parámetros) devolvemos
  // el archivo estático correspondiente
  if (req.path === '/login.html') {
    return res.sendFile(path.join(__dirname, '../frontend', 'login.html'));
  }
  // en cualquier otro caso, servir index.html para la SPA
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Middleware de errores (SIEMPRE al final)
app.use(errorHandler);

// export para pruebas
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}
