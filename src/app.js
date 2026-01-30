require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);

// archivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));

// Ruta raíz, cada página HTML debe tener su propia ruta
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'login.html'));
});
app.get('/main', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'main.html'));
});

// Middleware de errores (SIEMPRE al final)
app.use(errorHandler);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
