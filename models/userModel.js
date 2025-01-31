

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  role: {
    type: String,
    enum: ['patient', 'admin'],
    default: 'patient',
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  photo: {
    type: String,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
  },
  bloodType: {
    type: String,
  },
  appointments: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'Appointment',
    },
  ],
  loginAttempts: {
    type: Number,
    default: 0, // Track the number of failed login attempts
  },
  lockUntil: {
    type: Date, // Lockout expiration timestamp
    default: null,
  },
  passwordHistory: {
    type: [String], // Array to store hashed passwords for reuse prevention
    default: [],
  },
  passwordLastChanged: {
    type: Date, // Track the last time the password was changed
    default: null,
  },

  resetPasswordOTP: {
    type: Number,
    default: null,
  },

  resetPasswordExpires: {
    type: Date,
    default: null,
  }

});

// Add a virtual field to check if the user is currently locked
userSchema.virtual("isLocked").get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

// Pre-save middleware to limit password history
userSchema.pre("save", async function (next) {
  const PASSWORD_HISTORY_LIMIT = 5; // Max number of past passwords to store
  if (this.isModified("password")) {
    // Ensure the password history only keeps the last PASSWORD_HISTORY_LIMIT entries
    if (this.passwordHistory.length >= PASSWORD_HISTORY_LIMIT) {
      this.passwordHistory.shift(); // Remove the oldest password
    }
    this.passwordHistory.push(this.password); // Add the new password to history
    this.passwordLastChanged = Date.now(); // Update the password change timestamp
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
