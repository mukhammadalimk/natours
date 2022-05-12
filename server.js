const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DB.replace('<PASSWORD>', process.env.DB_PSW);

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 8000;
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Server is running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// process.on('SIGTERM', () => {
//   console.log('👋 SIGTERM RECEIVER. Shutting down gracefully');
//   server.close(() => {
//     console.log('💥 Process terminated!');
//   });
// });
