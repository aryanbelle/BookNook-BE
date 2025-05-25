const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author ID is required']
  },
  author: {
    type: String,
    required: [true, 'Please add an author'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  coverImage: {
    type: String,
    required: [true, 'Please add a cover image URL']
  },
  genre: {
    type: String,
    required: [true, 'Please add a genre'],
    trim: true
  },
  publishedDate: {
    type: String,
    required: [true, 'Please add a published date']
  },
  featured: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot be more than 5'],
    set: val => Math.round(val * 10) / 10 // Round to 1 decimal place
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reviews
bookSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'bookId',
  justOne: false
});

// Cascade delete reviews when a book is deleted
bookSchema.pre('remove', async function(next) {
  await this.model('Review').deleteMany({ bookId: this._id });
  next();
});

module.exports = mongoose.model('Book', bookSchema);
