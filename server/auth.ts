import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import type { Express } from 'express';

const PgSession = connectPg(session);

// Configure session store
export const sessionStore = new PgSession({
  conString: process.env.DATABASE_URL,
  tableName: 'user_sessions',
  createTableIfMissing: true,
});

// Configure session middleware
export const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

// Passport configuration
export function configurePassport() {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByProviderId('google', profile.id);
            
            if (!user) {
              // Create new user
              user = await storage.createUser({
                email: profile.emails?.[0]?.value || '',
                name: profile.displayName || '',
                avatar: profile.photos?.[0]?.value || null,
                provider: 'google',
                providerId: profile.id,
              });
            } else {
              // Update existing user with latest profile info
              user = await storage.updateUser(user.id, {
                name: profile.displayName || user.name,
                avatar: profile.photos?.[0]?.value || user.avatar,
              });
            }
            
            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }

  // Apple OAuth Strategy
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    passport.use(
      new AppleStrategy(
        {
          clientID: process.env.APPLE_CLIENT_ID,
          teamID: process.env.APPLE_TEAM_ID,
          keyID: process.env.APPLE_KEY_ID,
          privateKey: process.env.APPLE_PRIVATE_KEY,
          callbackURL: '/auth/apple/callback',
        },
        async (accessToken, refreshToken, idToken, profile, done) => {
          try {
            let user = await storage.getUserByProviderId('apple', profile.id);
            
            if (!user) {
              // Create new user
              user = await storage.createUser({
                email: profile.email || '',
                name: profile.name?.firstName + ' ' + profile.name?.lastName || 'Apple User',
                avatar: null,
                provider: 'apple',
                providerId: profile.id,
              });
            }
            
            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  }

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Setup authentication routes
export function setupAuthRoutes(app: Express) {
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Google OAuth routes
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  // Apple OAuth routes
  app.get('/auth/apple', passport.authenticate('apple'));
  app.get('/auth/apple/callback',
    passport.authenticate('apple', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  // Logout route
  app.post('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get('/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });
}