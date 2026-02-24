const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Admin', 'User', 'Guest'],
    default: 'User'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  }
});

module.exports = mongoose.model('User', userSchema);

