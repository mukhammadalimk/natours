const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingController = require('./controllers/bookingController');
const User = require('./models/userModel');
const Booking = require('./models/bookingModel');

// Start express code
const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Implement cors
app.use(cors());
// Access-Control-Allow-Origin *
// api.natours.com, front-end natours.com
// app.use(cors({
//   origin: 'https://www.natours.com'
// }))

app.options('*', cors());
// app.options('/api/v1/tours/:id', cors());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
  // this ensures that only 100 requests in one hour is allowed
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter);

// Stripe webhook, BEFORE body-parser, because stripe needs the body as stream

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const userFound = await User.findOne({ email: session.customer_email });
  const user = userFound._id;
  const price = session.amount_total / 100;
  console.log(session);

  await Booking.create({ tour, user, price });
};

// app.use(bodyParser.json());
app.post(
  '/webhook-checkout',
  // bodyParser.raw({ type: 'application/json' }),
  // express.raw({ type: 'application/json' }),
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        // eslint-disable-next-line no-case-declarations
        const session = event.data.object;
        // Then define and call a function to handle the event checkout.session.completed
        createBookingCheckout(session);
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // if (event.type === 'checkout.session.completed')
    //   createBookingCheckout(event.data.object);

    res.status(200).json({ received: true });
  }
);

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
