const express = require('express');
const {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  getMyBooks
} = require('../controllers/bookController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(getBooks)
  .post(protect, authorize('admin'), createBook);

router
  .route('/my-books')
  .get(protect, authorize('admin'), getMyBooks);

router
  .route('/:id')
  .get(getBook)
  .put(protect, authorize('admin'), updateBook)
  .delete(protect, authorize('admin'), deleteBook);

module.exports = router;
