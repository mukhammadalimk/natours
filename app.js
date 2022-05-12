const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
// const bookingController = require('./controllers/bookingController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
  // this ensures that only 100 requests in one hour is allowed
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Stripe webhook, BEFORE body-parser, because stripe needs the body as stream
// app.post(
//   '/webhook-checkout',
//   express.raw({ type: 'application/json' }),
//   bookingController.webhookCheckout
// );

// Body parsers, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // converts info into js object
// We need this middleware to update user data without our api. (with hmtl)
// This is url encoded form parcer
// app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize()); // this filters out all the $ signs from req.params, req.body, req.queryString

// Data sanitization against XSS
app.use(xss()); // this will clean any user input from malicious HTML code

// Prevent parameter pollution
// this middleware prevents dublication of parameters
// whitelist allows dublication of the string in it
app.use(
  hpp({
    whitelist: [
      'duration',
      'maxGroupSize',
      'difficulty',
      'ratingsAverage',
      'ratingsQuantity',
      'price',
    ],
  })
);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toDateString();
  // console.log(req.cookies);
  next();
});

// ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Better version
app.all('*', (req, res, next) => {
  // whenever next function receives any argument, express automatically knows
  // that there is an error. And it will skip all the other middlewares and
  // send the error to the global error handling middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Implementing a Global Error Handling Middleware
// when we specify four parameters, express automaticall knows that it is an error handling middleware
app.use(globalErrorHandler);

module.exports = app;
