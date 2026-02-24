const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// solo configurar la estrategia si existen las credenciales
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK || '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // buscar o crear usuario basado en googleId
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        // crear un usuario base
        user = await User.create({
          nombre: profile.displayName || 'Usuario Google',
          email: profile.emails && profile.emails[0] && profile.emails[0].value,
          password: Math.random().toString(36).slice(-8), // password aleatoria
          role: 'User',
          googleId: profile.id
        });
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
} else {
  console.warn('Google OAuth credentials not found, skipping Google strategy');
}

module.exports = passport;