# Collaborative Code Editor - Backend

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update MongoDB URI and other settings

3. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `NODE_ENV` - Environment (development/production)

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check

## Features

- ✅ MongoDB Atlas connection
- ✅ Express.js server
- ✅ Socket.IO for real-time communication
- ✅ CORS enabled
- ✅ Environment configuration
