const Book = require('../models/bookModel');
const Review = require('../models/reviewModel');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all books
// @route   GET /api/v1/books
// @access  Public
exports.getBooks = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    // Finding resource
    let query = Book.find(JSON.parse(queryStr));

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query = query.or([
        { title: searchRegex },
        { author: searchRegex },
        { genre: searchRegex }
      ]);
    }

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
    const total = await Book.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const books = await query;

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
        books,
        pagination: {
          totalBooks: total,
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

// @desc    Get single book
// @route   GET /api/v1/books/:id
// @access  Public
exports.getBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).populate({
      path: 'reviews',
      populate: {
        path: 'userId',
        select: 'name username avatar'
      }
    });

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: book
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new book
// @route   POST /api/v1/books
// @access  Private/Admin
exports.createBook = async (req, res, next) => {
  try {
    // Always set authorId and author to the authenticated user
    req.body.authorId = req.user._id;
    req.body.author = req.user.username || req.user.name;
    const book = await Book.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: book
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update book
// @route   PUT /api/v1/books/:id
// @access  Private/Admin
exports.updateBook = async (req, res, next) => {
  try {
    let book = await Book.findById(req.params.id);

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.params.id}`, 404)
      );
    }

    book = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: book
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete book
// @route   DELETE /api/v1/books/:id
// @access  Private/Admin
exports.deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return next(new ErrorResponse(`Book not found with id of ${req.params.id}`, 404));
    }

    // Extra security check - ensure the book belongs to the current admin
    if (book.authorId.toString() !== req.user._id.toString()) {
      return next(new ErrorResponse('Not authorized to delete this book', 403));
    }

    await book.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get books owned by current admin
// @route   GET /api/v1/books/my-books
// @access  Private/Admin
exports.getMyBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ authorId: req.user._id });
    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (err) {
    next(err);
  }
};
