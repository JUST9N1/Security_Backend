

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
    default: 0, 
  },
  lockUntil: {
    type: Date, 
    default: null,
  },
  passwordHistory: {
    type: [String], 
    default: [],
  },
  passwordLastChanged: {
    type: Date, 
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
  const PASSWORD_HISTORY_LIMIT = 5; 
  if (this.isModified("password")) {
    
    if (this.passwordHistory.length >= PASSWORD_HISTORY_LIMIT) {
      this.passwordHistory.shift(); 
    }
    this.passwordHistory.push(this.password); 
    this.passwordLastChanged = Date.now();
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
