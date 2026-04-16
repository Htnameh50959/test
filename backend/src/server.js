// --- THIS IS THE MAIN ENTRY POINT OF OUR BACKEND APPLICATION ---
// We use a library called 'express' to help us build a web server.

// First, we need to import all the tools we need.
const express = require('express'); // 'express' is the framework for our server.
const dotenv = require('dotenv');   // 'dotenv' lets us use secret variables from the .env file.
const cors = require('cors');       // 'cors' helps different websites talk to our server.
const http = require('http');       // 'http' is a built-in tool to handle web requests.

// This line imports a special function we wrote to connect to the database.
const connectToDatabase = require('./config/db');

// This imports the Redis client initialiser.
const { connectRedis } = require('./config/redis');

// This imports the Socket.io service.
const { initSocket, getIO } = require('./services/socket');

// This imports the cache metrics helper for the health endpoint.
const { getCacheMetrics } = require('./utils/cache');

// This tells the server to read the secret variables from the .env file.
dotenv.config();

// Now, we call the function to connect to the database (MongoDB).
connectToDatabase();

// Connect to Redis (non-blocking — app runs even if Redis is unavailable).
connectRedis();

// Here we import the "routes". Each route handles a different part of the app.
// For example, 'auth' handles logging in, and 'orders' handles food orders.
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const restaurantRoutes = require('./routes/restaurants');
const eventRoutes = require('./routes/events');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const merchantRoutes = require('./routes/merchant');
const cartRoutes = require('./routes/cart');
const bookingRoutes = require('./routes/bookings');
const courierRoutes = require('./routes/courier');


// We create an 'app' instance of Express. This is our server's brain.
const myApp = express();

// We want our server to understand "JSON" data. This is how the frontend talks to us.
myApp.use(express.json());

// We use 'cors' to allow the frontend (usually running on a different port) to talk to us.
// In production CLIENT_URL should be set to the deployed frontend URL.
myApp.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}));

// This is a "Middleware". It runs for every single request.
// We use it here just to log what's happening in the console.
myApp.use(function(request, response, next) {
  console.log('Got a request: ' + request.method + ' to ' + request.url);
  next(); // Go to the next part of the server logic.
});

// Now we tell the app which URL paths correspond to which routes.
myApp.use('/api/v1/auth', authRoutes);
myApp.use('/api/v1/users', userRoutes);
myApp.use('/api/v1/restaurants', restaurantRoutes);
// Nested: GET /api/v1/restaurants/:restaurantId/reviews  (legacy pattern)
myApp.use('/api/v1/restaurants/:restaurantId/reviews', reviewRoutes);
myApp.use('/api/v1/events', eventRoutes);
myApp.use('/api/v1/orders', orderRoutes);
myApp.use('/api/v1/reviews', reviewRoutes);
myApp.use('/api/v1/merchant', merchantRoutes);
myApp.use('/api/v1/cart', cartRoutes);
myApp.use('/api/v1/bookings', bookingRoutes);
myApp.use('/api/v1/courier', courierRoutes);

myApp.use('/api/v1/admin', require('./routes/admin'));
myApp.use('/api/v1/admin/performance', require('./routes/performance'));

// Health check route
myApp.get('/api/v1/health', function(req, res) {
  res.status(200).json({
    success:   true,
    message:   'The server is running perfectly!',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
    cache:     getCacheMetrics(),
  });
});

// 404 handler — catches any request that didn't match a registered route
myApp.use(function(req, res) {
  res.status(404).json({
    success: false,
    code:    'NOT_FOUND',
    message: `The route ${req.method} ${req.originalUrl} does not exist on this server.`,
  });
});

// ── GLOBAL ERROR HANDLER (must be last, after all routes) ──────────────────
// This catches every error passed via next(err) across the entire app.
const errorHandler = require('./middleware/error');
myApp.use(errorHandler);

// We wrap our Express app in an HTTP server so we can use Sockets (real-time).
const myHttpServer = http.createServer(myApp);

// Initialize Socket.io (Real-time engine).
initSocket(myHttpServer);

// We decide which PORT our server will listen on.
const thePortNumber = process.env.PORT || 3001;

// Finally, we start the server!
const serverInstance = myHttpServer.listen(thePortNumber, function() {
  console.log('=========================================');
  console.log('Server is alive on port: ' + thePortNumber);
  console.log('Go to http://localhost:' + thePortNumber + '/api/v1/health to test it.');
  console.log('=========================================');
  
  // ── BACKGROUND JOBS ────────────────────────────────────────────────────────
  // Auto-complete delivered orders every 5 minutes
  const { autoCompleteDeliveredOrders } = require('./controllers/orders');
  const AUTO_COMPLETE_INTERVAL = 5 * 60 * 1000; // 5 minutes
  setInterval(autoCompleteDeliveredOrders, AUTO_COMPLETE_INTERVAL);
  console.log('[Background Jobs] Order auto-completion service started.');
});

// ── GRACEFUL SHUTDOWN ──────────────────────────────────────────────────────
// This handles closing everything cleanly when the server is stopped.
const gracefulShutdown = () => {
  console.log('SIGTERM/SIGINT received, closing server...');
  
  // Close the HTTP server first
  serverInstance.close(async () => {
    console.log('HTTP server closed.');
    
    try {
      // Close Socket.io
      const io = getIO();
      if (io) {
        io.close();
        console.log('WebSocket server closed.');
      }
      
      // Close Mongoose connection
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('Mongoose connection closed.');
      
      // Close Redis connection
      const { getClient } = require('./config/redis');
      const redisClient = getClient();
      if (redisClient) {
        await redisClient.quit();
        console.log('Redis client closed.');
      }
      
      process.exit(0);
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);


