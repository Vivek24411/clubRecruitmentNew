const express = require('express')
const studentRouter = require('./src/routes/student.routes')
const adminRouter = require('./src/routes/admin.routes')
const clubRouter = require('./src/routes/club.routes')
const app = express()
const cors = require('cors')

// Parse allowed origins from environment variable or use development defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
    
// Configure CORS with specific options
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true // Enable credentials (cookies, authorization headers, etc.)
}));

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use('/student',studentRouter)
app.use('/admin',adminRouter)
app.use('/club',clubRouter)


module.exports = app