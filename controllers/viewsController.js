const Tour = require('../models/tourModel');
const Review = require('../models/reviewModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Booking = require('../models/bookingModel');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;

  if (alert === 'booking')
    res.locals.alert = `Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediately, please come back later.`;
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render that template using tour data from 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  // Now we have access to user and tour. So now here we can determine
  // if tour is booked or not.

  const booking = await Booking.findOne({ user: res.locals.user, tour: tour });

  let commentExist;
  if (res.locals.user) {
    commentExist = tour.reviews.some(
      (review) => review.user.id === res.locals.user.id
    );
  }

  let booked;

  if (booking) {
    booked = true;
  } else {
    booked = false;
  }

  // 2) Build template
  // 3) Render template using data from 1)
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
    booked,
    commentExist,
  });
});

exports.getloginForm = catchAsync(async (req, res, next) => {
  res.status(200).render('login', {
    title: `Log in your account`,
  });
});

exports.getSignupForm = catchAsync(async (req, res, next) => {
  res.status(201).render('signup', {
    title: 'Sign up to get started',
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with the returned IDs
  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  // 1) Get reviews of the currently logged in user

  const reviews = await Review.find({ user: res.locals.user.id }).populate({
    path: 'tour',
    select: 'name slug',
  });

  res.status(200).render('reviews', {
    title: 'My reviews',
    reviews,
    toursNames: true,
  });
});
// Update user data without our api. (with html)
// exports.updateUserData = catchAsync(async (req, res, next) => {
//   const updatedUser = await User.findByIdAndUpdate(
//     req.user.id,
//     {
//       name: req.body.name,
//       email: req.body.email,
//     },
//     {
//       new: true,
//       runValidators: true,
//     }
//   );

//   res.status(200).render('account', {
//     title: 'Your account',
//     user: updatedUser,
//   });
// });
