# Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free tier available)
- Your code pushed to a GitHub repository

## Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your GitHub account
3. Click "New Project"
4. Import your GitHub repository

### 2. Configure Project Settings
- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 3. Environment Variables (if needed)
If you're using a database or other services:
1. Go to Project Settings → Environment Variables
2. Add any required environment variables
3. Copy from your `.env.example` file

### 4. Deploy
1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at `https://your-project-name.vercel.app`

## Important Notes for Socket.IO on Vercel

### Limitations
- **Serverless Functions**: Vercel uses serverless functions, which have some limitations:
  - 10-second execution timeout for Hobby plan
  - 60-second timeout for Pro plan
  - Functions are stateless (no persistent memory between requests)

### Socket.IO Considerations
- WebSocket connections may be less stable on serverless
- Polling transport is more reliable on Vercel
- Consider using external services for production:
  - **Ably** for WebSocket connections
  - **Socket.IO with dedicated server** (Railway, Render, etc.)

### Scaling Recommendations
For production with many users, consider:
1. **Separate Socket.IO Server**: Deploy on Railway, Render, or DigitalOcean
2. **Redis for State**: Use Redis for user state management
3. **Database**: PostgreSQL or MongoDB for persistence
4. **CDN**: Use Vercel's edge network for static assets

## Alternative Deployment Options

### For Better Socket.IO Support:
1. **Railway**: Better for persistent connections
2. **Render**: Good WebSocket support
3. **DigitalOcean App Platform**: Full-stack support
4. **Heroku**: Traditional hosting with persistent connections

## Testing Your Deployment
1. Open your Vercel URL
2. Test video chat functionality
3. Check browser console for any errors
4. Test with multiple users/devices

## Troubleshooting
- If Socket.IO doesn't work, check the browser console
- Ensure CORS is properly configured
- Consider using polling transport only for Vercel
- Check Vercel function logs in the dashboard