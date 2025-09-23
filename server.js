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




// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const morgan = 'morgan';
// const path = require('path');
// const http = require('http');
// const session = require('express-session');
// const cluster = require('cluster');
// const os = require('os');

// // =================== New Imports for Redis and Socket.IO ===================
// const { createClient } = require('redis');
// const RedisStore = require('connect-redis').default;
// const { Server } = require('socket.io');
// const { createAdapter } = require('@socket.io/redis-adapter');
// // =========================================================================

// // Get the number of CPU cores
// const numCPUs = os.cpus().length;


// if (cluster.isPrimary) {
//   console.log(`✅ Primary ${process.pid} is running`);

//   // Fork workers.
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   // If a worker dies, log it and fork a new one to replace it.
//   cluster.on('exit', (worker, code, signal) => {
//     console.log(`❌ Worker ${worker.process.pid} died`);
//     console.log('Forking a new worker...');
//     cluster.fork();
//   });
// } else {
//   // =================== Worker Process (Server Logic) ===================
//   // This code will run on each forked worker process.

//   const app = express();
//   const server = http.createServer(app);

//   // DB connection
//   const connectDB = require('./configs/db');

//   // Role login import
//   const roleLoginRoute = require('./routes/auth.role.route.js');

//   // Import Admin routes
//   const adminAuthRoutes = require('./routes/admins/admins.route');
//   const adminClassRoutes = require('./routes/admins/class.routes');
//   const adminReportRoutes = require('./routes/admins/reports.routes');
//   const adminStudentRoutes = require('./routes/admins/student.routes');
//   const adminTeacherRoutes = require('./routes/admins/teacher.routes');

//   // Import Student routes
//   const studentRoutes = require('./routes/students/student.routes.js');

//   const startServer = async () => {
//     try {
//       const redisClient = createClient({
//         password: process.env.REDIS_PASSWORD,
//         socket: {
//           host: process.env.REDIS_HOST,
//           port: process.env.REDIS_PORT,
//         },
//       });

//       redisClient.on('error', (err) => console.log('Redis Client Error', err));
//       await redisClient.connect();
//       console.log('✅ Connected to Redis for session management');

//       const io = new Server(server, {
//         cors: {
//           origin: '*',
//           methods: ['GET', 'POST'],
//         },
//       });

//       const pubClient = redisClient.duplicate();
//       const subClient = pubClient.duplicate();

//       io.adapter(createAdapter(pubClient, subClient));
//       console.log('✅ Socket.IO is using Redis Adapter');

//       io.on('connection', (socket) => {
//         console.log(`⚡ User connected: ${socket.id} on worker ${process.pid}`);
//         socket.on('disconnect', () => {
//           console.log(`🔥 User disconnected: ${socket.id} on worker ${process.pid}`);
//         });

//         socket.on('chat message', (msg) => {
//           io.emit('chat message', `Worker ${process.pid} says: ${msg}`);
//         });
//       });

//       const corsOption = {
//         methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//         exposedHeaders: ['x-access-token'],
//       };

//       app.use(cors(corsOption));
//       app.use(morgan('dev'));
      
//       app.use(
//         session({
//           store: new RedisStore({ client: redisClient }),
//           secret: 'keyboard cat',
//           resave: false,
//           saveUninitialized: false,
//           cookie: {
//             secure: process.env.NODE_ENV === 'production',
//             httpOnly: true,
//             maxAge: 1000 * 60 * 60 * 24,
//           },
//         })
//       );

//       app.use(express.json());
//       app.use(express.urlencoded({ extended: true }));
//       app.use(express.static('public'));
//       app.use(express.static(path.join(__dirname, 'public')));

//       // Root route
//       app.get('/', (req, res) => {
//         res.send(`API is Running on Port ${process.env.PORT} by worker ${process.pid}`);
//       });

//       // Role login route
//       app.use('/role/auth', roleLoginRoute);

//       // Admin routes
//       app.use('/api/admins/auth', adminAuthRoutes);
//       app.use('/api/admins/classes', adminClassRoutes);
//       app.use('/api/admins/reports', adminReportRoutes);
//       app.use('/api/admins/students', adminStudentRoutes);
//       app.use('/api/admins/teachers', adminTeacherRoutes);

//       // Student routes
//       app.use('/api/student', studentRoutes);

//       // 404 Handler
//       app.use(function (req, res) {
//         res.status(404).json({
//           status: 404,
//           message: "Sorry, can't find that!",
//           data: {},
//         });
//       });

//       // Connect to MongoDB
//       await connectDB();

//       // Start the server
//       server.listen(process.env.PORT, () => {
//         console.log(`✅ Worker ${process.pid} started and listening at PORT ${process.env.PORT}`);
//       });
//     } catch (error) {
//       console.error('❌ Failed to start server:', error);
//       process.exit(1);
//     }
//   };

//   startServer();
// }