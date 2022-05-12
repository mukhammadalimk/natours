const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
// const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(viewsController.alerts);

router.get(
  '/',
  // bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getloginForm);
router.get('/me', authController.protect, viewsController.getAccount);

router.get(
  '/my-reviews',
  authController.isLoggedIn,
  viewsController.getMyReviews
);

router.get('/signup', viewsController.getSignupForm);
router.get(
  '/my-tours',
  // bookingController.createBookingCheckout,
  authController.protect,
  viewsController.getMyTours
);

module.exports = router;
