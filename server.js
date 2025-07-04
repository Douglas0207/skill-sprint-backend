const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from .env
dotenv.config();

const app = express();

// CORS Middleware - allows React frontend (on port 3000) to communicate with backend
const allowedOrigins = [
  'http://localhost:3000',
  'https://skill-sprint-rhra1dh3a-robinson-abel-douglas-projects.vercel.app',
  'https://skill-sprint-pink.vercel.app',
  'https://skill-sprint-k70wa3nz9-robinson-abel-douglas-projects.vercel.app'
];


app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow request
    } else {
      callback(new Error('CORS policy violation: ' + origin)); // Block others
    }
  },
  credentials: true
}));

// Optional: Handle preflight requests
app.options('*', cors());


// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsprint', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/okrs', require('./routes/okrs'));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ message: 'SkillSprint API is running!' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start Server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
