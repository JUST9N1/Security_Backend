
const mongoose = require("mongoose");
const Worker = require("./WorkerSchema");

const reviewSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Types.ObjectId,
      ref: "Worker",
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    reviewText: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  { timestamps: true }
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});


reviewSchema.statics.calcAverageRatings = async function (workerId) {
  
  const stats = await this.aggregate([
    {
      $match: { worker: workerId },
    },
    {
      $group: {
        _id: '$worker',
        numOfRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  await Worker.findByIdAndUpdate(workerId, {
    totalRating: stats[0].numOfRating,
    averageRating: stats[0].avgRating,
  });
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.worker);
});

module.exports = mongoose.model("Review", reviewSchema);


