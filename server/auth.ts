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

console.log('Session store configured with database URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');

// Configure session middleware
export const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

console.log('Session middleware configured with secret:', process.env.SESSION_SECRET ? 'Present' : 'Missing');

// Passport configuration
export function configurePassport() {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Configuring Google OAuth with callback URL:', `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/auth/google/callback`);
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.NODE_ENV === 'production' 
            ? `https://collaborative-canvas-pkothare.replit.app/auth/google/callback`
            : `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/auth/google/callback`,
          scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('OAuth profile received:', {
              id: profile.id,
              email: profile.emails?.[0]?.value,
              name: profile.displayName
            });
            
            let user = await storage.getUserByProviderId('google', profile.id);
            
            if (!user) {
              console.log('Creating new user...');
              // Create new user
              user = await storage.createUser({
                email: profile.emails?.[0]?.value || '',
                name: profile.displayName || '',
                avatar: profile.photos?.[0]?.value || null,
                provider: 'google',
                providerId: profile.id,
              });
              console.log('New user created:', user.id);
            } else {
              console.log('Existing user found, updating...');
              // Update existing user with latest profile info
              user = await storage.updateUser(user.id, {
                name: profile.displayName || user.name,
                avatar: profile.photos?.[0]?.value || user.avatar,
              });
            }
            
            return done(null, user);
          } catch (error) {
            console.error('OAuth strategy error:', error);
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
      if (user) {
        done(null, user);
      } else {
        // Don't throw error for missing users, just return null
        done(null, null);
      }
    } catch (error) {
      console.error('Error deserializing user:', error);
      // Don't throw error, just return null for invalid sessions
      done(null, null);
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
  app.get('/auth/google', (req, res, next) => {
    console.log('Starting Google OAuth flow...');
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      accessType: 'offline',
      prompt: 'consent'
    })(req, res, next);
  });
  
  app.get('/auth/google/callback',
    (req, res, next) => {
      console.log('Google OAuth callback received');
      console.log('Query params:', req.query);
      passport.authenticate('google', (err, user, info) => {
        if (err) {
          console.error('OAuth error:', err);
          return res.redirect('/?error=oauth_error');
        }
        if (!user) {
          console.error('OAuth failed, no user:', info);
          return res.redirect('/?error=oauth_failed');
        }
        req.logIn(user, (err) => {
          if (err) {
            console.error('Login error:', err);
            return res.redirect('/?error=login_error');
          }
          console.log('User successfully authenticated:', user.email);
          return res.redirect('/');
        });
      })(req, res, next);
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

  // Demo login route
  app.post('/auth/demo-login', async (req, res) => {
    try {
      console.log('Demo login request received:', req.body);
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        console.log('Invalid name provided:', name);
        return res.status(400).json({ error: 'Name is required' });
      }

      console.log('Creating demo user with name:', name);
      // Create a demo user
      const demoUser = await storage.createUser({
        email: `demo-${Date.now()}@demo.com`,
        name: name,
        avatar: null,
        provider: 'demo',
        providerId: `demo-${Date.now()}`,
      });

      console.log('Demo user created:', demoUser);

      req.logIn(demoUser, (err) => {
        if (err) {
          console.error('Demo login error:', err);
          return res.status(500).json({ error: 'Login failed' });
        }
        console.log('Demo user logged in successfully:', demoUser.name);
        res.json(demoUser);
      });
    } catch (error) {
      console.error('Demo login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
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