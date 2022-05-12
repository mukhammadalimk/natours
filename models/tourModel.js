const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [
        40,
        'A tour name must have less or equal than 40 characteres',
      ],
      minLength: [
        10,
        'A tour name must have more or equal than 10 characteres',
      ],
      // validate: [ validator.isAlpha, 'A tour name must only containe characteres!'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [4.5, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['difficult', 'medium', 'easy'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // "this" only works in current doc on NEW document creation. It doest not work in .update()
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price!',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // This is how we embed documents. We need to create an array to embed a document into anohter one.
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // This is embedding tour guides into tour document
    // guides: Array,

    // This is child referencing tour guides into tour document
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true }, // this makes virtual properties to be shown.
    toObject: { virtuals: true },
  }
);
// This is compound index
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

tourSchema.index({ startLocation: '2dsphere' });

// Virtual Properties. these properties will not be saved into database
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual Populate
/*
   So let us start with the foreign field. And so, this is the name of the field in the other model.
   So in the Review model in this case, where the reference to the current model is stored.
   And that is, in this case, the Tour field, right?
*/
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// (Mongoose middleware) DOCUMENT MIDDLEWARE: 'save' runs before .save(). and .create()
tourSchema.pre('save', function (next) {
  // console.log(this); // "this" is the tour we created before saving into the database
  this.slug = slugify(this.name, { lower: true });
  next();
});

// // Embeding tour guides into tour document
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// Populating with middleware
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// $geoNear should be in the first stage, if we did not comment this code, it would be in the second and we would get error
// // AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // console.log(this.pipeline()); // it shows the aggregations we created
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
