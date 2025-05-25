const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Route files
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const userRoutes = require('./routes/userRoutes');
const bodyParser = require("body-parser");

const app = express();

// Body parser
app.use(express.json());

// Enable CORS with proper configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://book-nook-zeta.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.options('*', cors(corsOptions)); // Preflight handling
app.use(cors(corsOptions));         // Main CORS middleware


// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Define API version
const API_VERSION = 'v1';
const API_PREFIX = `/api/${API_VERSION}`;

// Mount routers
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/books`, bookRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'BookNook API is running',
    apiVersion: API_VERSION
  });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
