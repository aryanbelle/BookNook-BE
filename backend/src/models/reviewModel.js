const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Please add a rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    required: [true, 'Please add a comment'],
    trim: true
  }
}, {
  timestamps: true
});

// Prevent user from submitting more than one review per book
reviewSchema.index({ bookId: 1, userId: 1 }, { unique: true });

// Add a virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Static method to calculate average rating and update book
reviewSchema.statics.calculateAverageRating = async function(bookId) {
  const stats = await this.aggregate([
    {
      $match: { bookId: bookId }
    },
    {
      $group: {
        _id: '$bookId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await this.model('Book').findByIdAndUpdate(bookId, {
      rating: stats[0].averageRating,
      reviewCount: stats[0].reviewCount
    });
  } else {
    await this.model('Book').findByIdAndUpdate(bookId, {
      rating: 0,
      reviewCount: 0
    });
  }
};

// Call calculateAverageRating after save
reviewSchema.post('save', function() {
  this.constructor.calculateAverageRating(this.bookId);
});

// Call calculateAverageRating before remove
reviewSchema.pre('remove', function() {
  this.constructor.calculateAverageRating(this.bookId);
});

module.exports = mongoose.model('Review', reviewSchema);
