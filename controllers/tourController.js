const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else
    cb(new AppError(('Not an image! Please upload only images', 400), false));
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourPhotos = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 1 },
]);

exports.resizeTourPhotos = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // since it was defined by multer, now it is gone so we should define it
  req.body.imageCover = `tour-${req.user.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.files.imageCover.filename}`);

  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.user.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.alliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

/// NEW ONES
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }, // match is used for filtering
    },
    {
      $group: {
        // _id: null, // this means we group for every tour
        _id: { $toUpper: '$difficulty' },
        // _id: '$difficulty', // id bu yerda medium easy va difficult lar uchun pastdagi ma'lumotlarni grupalab beradi.
        numTours: { $sum: 1 }, // this calculates the number of tours
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    { $sort: { avgPrice: -1 } }, // sort bu yerda avgPrice ga qarab sort qilib beradi
    // {
    //   $match: {
    //     _id: { $ne: 'EASY' }, // this excludes the easy tours
    //   },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //. 2021

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', // agar sayohat 3 ta boshlanish vaqtiga ega bo'lsa, (unwind) it will make a tour for each date
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // extracts month out of the date
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 5,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        `Please provide latitude and longitude in the format lat,lng.`,
        400
      )
    );
  }

  // Mongodb expects us to write radius in a unit called radians. So we divied distance by the earch radius
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        `Please provide latitude and longitude in the format lat,lng.`,
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    // $geoNear is the only geospatial aggregation pipeline stage that actually exists.
    // $geoNear requires that at least one of our fields contains a geospatial index.
    // This one always needs to be the first one in the pipeline.
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        // So, distanceField, and so this is the name
        // of the field that will be created
        // and where all the calculated distances will be stored.
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    // project is used to get only certain number of info
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
