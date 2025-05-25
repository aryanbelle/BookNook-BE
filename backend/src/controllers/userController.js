const User = require('../models/userModel');
const Book = require('../models/bookModel');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user profile
// @route   GET /api/v1/users/:id
// @access  Private
exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'readingList.bookId',
        select: 'title author coverImage'
      });

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if the user is requesting their own profile or is an admin
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse('Not authorized to access this profile', 401)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        role: user.role,
        preferences: user.preferences,
        readingList: user.readingList
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/:id
// @access  Private
exports.updateUserProfile = async (req, res, next) => {
  try {
    // Check if user is updating their own profile
    if (req.user.id !== req.params.id) {
      return next(
        new ErrorResponse('Not authorized to update this profile', 401)
      );
    }

    // Get user
    let user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Fields that can be updated
    const allowedFields = {
      username: req.body.username,
      name: req.body.name,
      email: req.body.email,
      bio: req.body.bio,
      avatar: req.body.avatar,
      preferences: req.body.preferences
    };

    // Remove undefined fields
    Object.keys(allowedFields).forEach(key => 
      allowedFields[key] === undefined && delete allowedFields[key]
    );

    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: allowedFields },
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        role: user.role,
        preferences: user.preferences,
        readingList: user.readingList
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add book to reading list
// @route   POST /api/v1/users/:id/reading-list
// @access  Private
exports.addToReadingList = async (req, res, next) => {
  try {
    // Check if the user is updating their own reading list
    if (req.user.id !== req.params.id) {
      return next(
        new ErrorResponse('Not authorized to update this reading list', 401)
      );
    }

    // Check if book exists
    const book = await Book.findById(req.body.bookId);

    if (!book) {
      return next(
        new ErrorResponse(`Book not found with id of ${req.body.bookId}`, 404)
      );
    }

    // Check if book is already in reading list
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    const alreadyInList = user.readingList.find(
      item => item.bookId.toString() === req.body.bookId
    );

    if (alreadyInList) {
      return next(
        new ErrorResponse('Book already in reading list', 400)
      );
    }

    // Add book to reading list
    user.readingList.push({
      bookId: req.body.bookId,
      addedAt: Date.now()
    });

    await user.save();

    // Get the book details
    const addedBook = {
      bookId: book._id,
      title: book.title,
      author: book.author,
      coverImage: book.coverImage,
      addedAt: new Date()
    };

    res.status(200).json({
      success: true,
      message: 'Book added to reading list',
      data: addedBook
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove book from reading list
// @route   DELETE /api/v1/users/:id/reading-list/:bookId
// @access  Private
exports.removeFromReadingList = async (req, res, next) => {
  try {
    // Check if the user is updating their own reading list
    if (req.user.id !== req.params.id) {
      return next(
        new ErrorResponse('Not authorized to update this reading list', 401)
      );
    }

    // Find user
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if book is in reading list
    const bookIndex = user.readingList.findIndex(
      item => item.bookId.toString() === req.params.bookId
    );

    if (bookIndex === -1) {
      return next(
        new ErrorResponse('Book not found in reading list', 404)
      );
    }

    // Remove book from reading list
    user.readingList.splice(bookIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Book removed from reading list'
    });
  } catch (err) {
    next(err);
  }
};
