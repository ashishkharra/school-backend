require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const session = require('express-session');

const app = express();
const server = http.createServer(app);

// DB connection
const connectDB = require('./configs/db');

// Role login import
const roleLoginRoute = require('./routes/auth.role.route.js');

// Import Admin routes
const adminAuthRoutes = require('./routes/admins/admins.route');
const adminClassRoutes = require('./routes/admins/class.routes');
const adminReportRoutes = require('./routes/admins/reports.routes');
const adminStudentRoutes = require('./routes/admins/student.routes');
const adminTeacherRoutes = require('./routes/admins/teacher.routes');

// Import Student routes
const studentRoutes = require('./routes/students/student.routes.js');



//import student routes
const teacherAttendanceRoute=require('./routes/teachers/attendance.route.js') 

// middlewares
const corsOption = {
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  exposedHeaders: ['x-access-token']
};

app.use(cors(corsOption));
app.use(morgan('dev'));
app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
  res.send(`API is Running on Port ${process.env.PORT}`);
});

// Role login route
app.use('/role/auth', roleLoginRoute);

// Admin routes
app.use('/api/admins/auth', adminAuthRoutes);
app.use('/api/admins/classes', adminClassRoutes);
app.use('/api/admins/reports', adminReportRoutes);
app.use('/api/admins/students', adminStudentRoutes);
app.use('/api/admins/teachers', adminTeacherRoutes);

// Student routes
app.use('/api/student', studentRoutes)


//teacher route

app.use("/api/teacher",teacherAttendanceRoute)
// 404 Handler
app.use(function (req, res) {
  res.status(404).json({
    status: 404,
    message: "Sorry, can't find that!",
    data: {}
  });
});

connectDB();
server.listen(process.env.PORT, () => {
  console.log('✅ Server is running at PORT', process.env.PORT);
});
