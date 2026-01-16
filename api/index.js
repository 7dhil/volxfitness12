require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MongoStore = require('connect-mongo');
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
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/mywebapp',
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 24 hours
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true in production (HTTPS)
        httpOnly: true,
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

// MongoDB connection options for serverless
let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        return mongoose.connection;
    }
    
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mywebapp', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false, // Disable mongoose buffering
            bufferMaxEntries: 0, // Disable mongoose buffering
            serverSelectionTimeoutMS: 30000, // Timeout after 30s instead of 30000ms
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        });
        
        isConnected = true;
        console.log('MongoDB connected');
        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        isConnected = false;
        throw error;
    }
};

// Initialize DB connection
connectDB().catch(console.error);

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
        // Ensure DB connection
        await connectDB();
        
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

// User profile route
app.get('/api/users/profile', async (req, res) => {
    try {
        // Ensure DB connection
        await connectDB();
        
        // Check both session user (regular login) and passport user (Google login)
        const user = req.session.user || req.user;
        
        if (user) {
            res.json({
                id: user._id || user.id,
                name: user.name || user.displayName,
                email: user.email
            });
        } else {
            res.status(401).json({ error: 'Not authenticated' });
        }
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'An error occurred fetching profile' });
    }
});

// Import and use routes
const users = require('../routes/users');
app.use('/api/users', async (req, res, next) => {
    try {
        // Ensure DB connection before processing routes
        await connectDB();
        next();
    } catch (error) {
        console.error('DB connection error in users route:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
}, users);

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
        // For Vercel deployment, redirect to the main domain instead of relative path
        res.redirect('/');
    }
);

// Logout route
app.get('/api/logout', (req, res, next) => {
    // Handle logout with proper error handling
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({ error: 'Could not destroy session' });
            }
            
            req.logout((err) => {
                if (err) {
                    console.error('Logout error:', err);
                    return res.status(500).json({ error: 'Could not log out' });
                }
                res.status(200).json({ message: 'Logged out successfully' });
            });
        });
    } else {
        // If no session exists, just log out
        req.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: 'Could not log out' });
            }
            res.status(200).json({ message: 'Logged out successfully' });
        });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
        // Ensure DB connection
        await connectDB();
        
        const user = await User.findOne({ email, password });
        if (user) {
            req.session.user = user; // Store user in session
            res.json({ message: 'Login successful', user: { id: user._id, name: user.name, email: user.email } });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'An error occurred during login', details: error.message });
    }
});

// Export the app as a Vercel serverless function
module.exports = async (req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Pass the request to the Express app
        await app(req, res);
    } catch (error) {
        console.error('Unhandled error in API route:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
};