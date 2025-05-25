const Review = require('../models/reviewModel');
const Book = require('../models/bookModel');
const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get reviews for a book
// @route   GET /api/v1/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    if (!req.query.bookId) {
      return next(
        new ErrorResponse('Please provide a book ID', 400)
      );
    }

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Finding resource
    let query = Review.find(reqQuery).populate({
      path: 'userId',
      select: 'name username avatar'
    });

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Review.countDocuments(reqQuery);

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const reviews = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          totalReviews: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
          hasNextPage: endIndex < total,
          hasPrevPage: startIndex > 0
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate({
      path: 'userId',
      select: 'name username avatar'
    });

    if (!review) {
      return next(
        new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add review
// @route   POST /api/v1/reviews
// @access  Private
exports.addReview = async (req, res, next) => {
  try {
    // Add user ID to request body
    req.body.userId = req.user.id;

    // Check if book exists
    const book = await Book.findById(req.body.bookId);

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.body.bookId}`, 404)
      );
    }

    // Check if user is the author of the book
    if (book.author === req.user.username) {
      return next(
        new ErrorResponse('Authors cannot review their own books', 400)
      );
    }

    // Check if user already reviewed this book
    const existingReview = await Review.findOne({
      userId: req.user.id,
      bookId: req.body.bookId
    });

    if (existingReview) {
      return next(
        new ErrorResponse('You have already reviewed this book', 400)
      );
    }

    const review = await Review.create(req.body);

    // Populate user data
    await review.populate({
      path: 'userId',
      select: 'name username avatar'
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return next(
        new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure review belongs to user or user is admin
    if (review.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse('Not authorized to update this review', 401)
      );
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate({
      path: 'userId',
      select: 'name username avatar'
    });

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: review
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return next(
        new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure review belongs to user or user is admin
    if (review.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse('Not authorized to delete this review', 401)
      );
    }

    // Store the bookId before deleting the review
    const bookId = review.bookId;
    
    // Use findByIdAndDelete instead of remove()
    await Review.findByIdAndDelete(req.params.id);
    
    // Recalculate the book rating after deleting the review
    // Use the static method directly on the Review model
    await Review.calculateAverageRating(bookId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
