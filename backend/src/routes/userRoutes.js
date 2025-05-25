const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  addToReadingList,
  removeFromReadingList
} = require('../controllers/userController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router
  .route('/:id')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router
  .route('/:id/reading-list')
  .post(protect, addToReadingList);

router
  .route('/:id/reading-list/:bookId')
  .delete(protect, removeFromReadingList);

module.exports = router;
