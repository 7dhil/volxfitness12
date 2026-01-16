# My Web App - Vercel Deployment Guide

This is a Node.js web application built with Express, MongoDB, and Passport authentication. It has been configured for deployment on Vercel.

## Features
- User authentication (both regular login and Google OAuth)
- Admin panel for user management
- Responsive frontend design
- MongoDB database integration

## Deployment on Vercel

### Prerequisites
- A Vercel account (sign up at [vercel.com](https://vercel.com))
- The Vercel CLI installed (`npm install -g vercel`) - optional

### Steps to Deploy

1. **Fork or clone this repository** to your GitHub account
2. **Import the project** in your Vercel dashboard
3. **Set environment variables** in the Vercel dashboard:
   - `SESSION_SECRET`: A random string for session encryption
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
   - `MONGODB_URI`: Your MongoDB connection string (e.g., MongoDB Atlas)
4. **Deploy** the project

### Environment Variables Required

Create these environment variables in your Vercel project settings:

- `SESSION_SECRET`: A secure random string for session encryption
- `GOOGLE_CLIENT_ID`: From Google Cloud Console OAuth credentials
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console OAuth credentials
- `MONGODB_URI`: MongoDB connection string (for production)

### Local Development

To run locally:

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in your environment variables
3. Run the application: `npm start`
4. Visit `http://localhost:3000`

## Project Structure

- `api/index.js` - Main serverless function for Vercel
- `public/` - Static assets and HTML files
- `models/` - Database models
- `routes/` - API routes
- `middleware/` - Custom middleware functions

## API Endpoints

All API endpoints are prefixed with `/api` when deployed on Vercel:
- `GET /api/users/profile` - Get current user profile
- `POST /api/users` - Create a new user
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user by ID
- `DELETE /api/users/:id` - Delete user by ID
- `POST /api/login` - Login endpoint
- `GET /api/logout` - Logout endpoint
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - Google OAuth callback

## Troubleshooting

### Images Not Showing After Deployment
If images are not visible after deployment to Vercel:
1. Ensure all image files are in the `public` directory
2. Image paths in HTML files should start with `/` to reference from the public directory root
3. For example: `<img src="/Images/image.png">` where Images folder is in the public directory

### Login Error: "An error occurred during login"
This error typically occurs due to:
1. Missing or incorrect environment variables in Vercel
2. Database connection issues (especially if using local MongoDB instead of MongoDB Atlas)
3. Network timeout issues in serverless environment
4. Incorrect API endpoint calls from frontend

To fix:
- Verify all environment variables are set in Vercel dashboard
- Ensure you're using a cloud MongoDB service like MongoDB Atlas, not local MongoDB
- Check that all frontend API calls use the `/api` prefix

### MongoDB Timeout Error: "Operation `users.findOne()` buffering timed out after 10000ms"
This error occurs when:
1. Using a local MongoDB connection string instead of a cloud-based one
2. The MongoDB server is not accessible from Vercel's servers
3. Network connectivity issues between Vercel and your database

To fix:
- Use a cloud-hosted MongoDB service like MongoDB Atlas
- Ensure your MongoDB connection string is correctly set in Vercel environment variables
- Check that your MongoDB instance allows connections from external sources

### Serverless Function Crashes
If you encounter serverless function crashes:
1. Ensure all required environment variables are set in Vercel
2. Verify your MongoDB connection string is correct
3. Check that your Google OAuth credentials are properly configured

### Database Connection Issues
- Make sure your MongoDB URI is accessible from Vercel's servers
- If using MongoDB Atlas, ensure IP whitelisting allows connections from Vercel
- Use a publicly accessible MongoDB service (like MongoDB Atlas) instead of local MongoDB

### Authentication Issues
- Verify your Google OAuth redirect URIs include your Vercel deployment URL
- Ensure session secrets match between environments