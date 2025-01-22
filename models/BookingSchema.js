const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    worker: {
      type: mongoose.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ticketPrice: {
      type: String,
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
    },
    
    status: {
      type: String,
      enum: ["pending", "approved", "cancelled", "completed"],
      default: "pending",
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate({
    path: "worker",
    select: "name specialization photo",
  });
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
