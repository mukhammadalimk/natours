const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

// Merge params
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

// And so, in order to get access to that parameter in this other router,
// we need to physically merge the parameters, okay.
// And so that's what mergeParams, set to true, does.

// POST /tour/32fssefewa3/reviews
// GET /tour/32fssefewa3/reviews // whenever this route is called, getAllReviews get also called
// POST /reviews

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
