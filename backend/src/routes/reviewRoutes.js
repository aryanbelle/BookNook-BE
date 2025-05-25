const express = require('express');
const {
  getReviews,
  getReview,
  addReview,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(getReviews)
  .post(protect, addReview);

router
  .route('/:id')
  .get(getReview)
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;
