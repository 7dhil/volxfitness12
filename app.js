require('dotenv').config();                         

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const User = require('./models/user');
const auth = require('./middleware/auth');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-session-secret', // Use environment variable or fallback
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files in the correct order
// First serve the main public directory
app.use(express.static(path.join(__dirname, 'public')));
// Serve images from the root Images directory
app.use('/Images', express.static(path.join(__dirname, 'Images')));

// Add route for root path to serve landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'landing', 'index.html'));
});

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/mywebapp')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Routes
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
    callbackURL: "/auth/google/callback"
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

const users = require('./routes/users');
app.use('/users', users);

// Admin routes
app.use('/admin', auth, express.static(path.join(__dirname, 'public/admin')));

// Google Authentication Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html' }),
    async (req, res) => {
        // Successful authentication, redirect to home or dashboard
        // Make sure the user is properly stored in session for consistency
        // Passport already handles session via serializeUser/deserializeUser
        // But we also store in req.session.user for compatibility with frontend checks
        if (req.user && !req.session.user) {
            req.session.user = req.user;
        }
        res.redirect('/');
    }
);

// Logout route
app.get('/logout', (req, res, next) => {
    // Destroy the session first
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            // Still attempt to logout even if session destruction fails
        }
        
        // Logout the user (this removes req.user)
        req.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            // Send success response instead of redirect
            res.status(200).json({ message: 'Logged out successfully' });
        });
    });
});

// Login route
app.post('/login', async (req, res) => {
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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});