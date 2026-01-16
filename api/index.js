require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const User = require('../models/user');
const auth = require('../middleware/auth');

// Create Express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true in production (HTTPS)
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Add route for root path to serve landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'landing', 'index.html'));
});

// MongoDB connection - connect once when the module loads
if (!global.mongooseConnection) {
    global.mongooseConnection = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mywebapp')
        .then(() => console.log('MongoDB connected'))
        .catch(err => console.log('MongoDB connection error:', err));
}

// Passport configuration
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            // If user exists, return the user
            return done(null, user);
        } else {
            // If user doesn't exist, create a new user
            user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value
            });
            
            await user.save();
            return done(null, user);
        }
    } catch (err) {
        return done(err, null);
    }
}));

// Import and use routes
const users = require('../routes/users');
app.use('/api/users', users);

// Admin routes
app.use('/api/admin', auth, express.static(path.join(__dirname, '../public/admin')));

// Google Authentication Routes
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    async (req, res) => {
        // Successful authentication, redirect to home or dashboard
        if (req.user && !req.session.user) {
            req.session.user = req.user;
        }
        res.redirect('/');
    }
);

// Logout route
app.get('/api/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        
        req.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            res.status(200).json({ message: 'Logged out successfully' });
        });
    });
});

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (user) {
            req.session.user = user; // Store user in session
            res.json({ message: 'Login successful', user: { id: user._id, name: user.name, email: user.email } });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export the app as a Vercel serverless function
module.exports = (req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Pass the request to the Express app
    return app(req, res);
};