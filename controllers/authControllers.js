const User = require('../models/userModel');
const Worker = require('../models/WorkerSchema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createError = require('../utils/appError');
const Admin = require('../models/AdminSchema');
const sendOTP = require('../utils/sendOTP');

// Lockout Configuration
const LOCKOUT_CONFIG = [
    { attempts: 5, lockTime: 15 * 1000 },       // Lock 15s after 5 attempts
    { attempts: 10, lockTime: 60 * 1000 },      // Lock 1m after 10 attempts
    { attempts: 15, lockTime: 5 * 60 * 1000 },  // Lock 5m after 15 attempts
    { attempts: Infinity, lockTime: 60 * 60 * 1000 }, // 1h after 20+ attempts
];

const getLockTime = (attempts) => {
    for (const config of LOCKOUT_CONFIG) {
        if (attempts <= config.attempts) {
            return config.lockTime;
        }
    }
    return 0;
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '15d',
    });
};

// Register User
exports.signup = async (req, res) => {
    const { email, password, name, role, photo, gender, phone } = req.body;

    try {
        let user = null;

        // Check if user already exists based on role
        if (role === 'patient') user = await User.findOne({ email });
        if (role === 'worker') user = await Worker.findOne({ email });
        if (role === 'admin') user = await Admin.findOne({ email });

        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user based on role
        if (role === 'patient') {
            user = new User({ name, email, password: hashedPassword, photo, gender, role, phone });
        }
        if (role === 'worker') {
            user = new Worker({ name, email, password: hashedPassword, photo, gender, role });
        }
        if (role === 'admin') {
            user = new Admin({ name, email, password: hashedPassword, photo, gender, role });
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'User registered successfully',
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error, Try again',
        });
    }
};

// Login User
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = null;

        // Find user based on role
        const patient = await User.findOne({ email });
        const worker = await Worker.findOne({ email });
        const admin = await Admin.findOne({ email });

        if (patient) user = patient;
        if (worker) user = worker;
        if (admin) user = admin;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Handle locked accounts
        if (user.isLocked) {
            if (user.lockUntil && user.lockUntil > Date.now()) {
                const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000);
                return res.status(403).json({
                    message: 'Account is locked due to multiple failed login attempts.',
                    remainingTime,
                });
            }
            user.lockUntil = null; // Reset lock if the lock period has passed
            await user.save();
        }

        // Validate password
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            user.loginAttempts = (user.loginAttempts || 0) + 1;

            const lockTime = getLockTime(user.loginAttempts);
            if (lockTime > 0 && user.loginAttempts >= LOCKOUT_CONFIG[0].attempts) {
                user.lockUntil = Date.now() + lockTime;
                await user.save();
                return res.status(403).json({
                    message: 'Account locked due to multiple failed login attempts.',
                    remainingTime: lockTime / 1000,
                });
            }

            await user.save();
            return res.status(400).json({
                message: 'Invalid credentials',
                remainingAttempts:
                    (LOCKOUT_CONFIG.find((config) => user.loginAttempts <= config.attempts)?.attempts ?? 0) -
                    user.loginAttempts,
            });
        }

        // Reset attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        // Generate token
        const token = generateToken(user);

        const { password: _, role, ...rest } = user._doc; // Omit password and role

        res.status(200).json({
            status: true,
            message: 'Logged in successfully',
            token,
            data: { ...rest },
            role,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Failed to login',
        });
    }
};

// Get Token by User ID
exports.getTokenById = async (req, res) => {
    const { id } = req.body;

    try {
        let user = null;

        // Find user based on ID
        const patient = await User.findById(id);
        const worker = await Worker.findById(id);
        const admin = await Admin.findById(id);

        if (patient) user = patient;
        if (worker) user = worker;
        if (admin) user = admin;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate token
        const token = generateToken(user);

        res.status(200).json({
            success: true,
            token,
            message: 'Token generated successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error, Try again',
        });
    }
};

exports.forgotPassword = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: "Please provide a phone number!",
    });
  }

  try {
    const user = await User.findOne({ phone: phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    const randomOTP = Math.floor(100000 + Math.random() * 900000);

    user.resetPasswordOTP = randomOTP;
    user.resetPasswordExpires = Date.now() + 600000;
    await user.save();

    const isSent = await sendOTP(phone, randomOTP);

    if (!isSent) {
      return res.status(500).json({
        success: false,
        message: "Error sending OTP",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { phone, otp, password } = req.body;

  if (!phone || !otp || !password) {
    return res.status(400).json({
      success: false,
      message: "Please enter all fields",
    });
  }

  try {
    const user = await User.findOne({ phone: phone });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }
    // Otp to integer
    const otpToInteger = parseInt(otp);

    if (user.resetPasswordOTP !== otpToInteger) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const randomSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, randomSalt);

    user.password = hashedPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    // console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};