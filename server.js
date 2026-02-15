const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (origin.startsWith("http://localhost:")) return cb(null, true)
    return cb(new Error("Not allowed by CORS"))
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.use(cors());
app.use(express.json());

// Simple test route
app.get('/', (req, res) => {
  res.send('Express server is running!');
});

// Dummy login route
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, phone, password, role } = req.body;
    
    // Validate input
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    
    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }
    
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Email or phone is required' });
    }
    
    // Accept any non-empty credentials
    return res.json({
      success: true,
      user: { email, phone, role },
      token: 'dummy-jwt-token',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});




