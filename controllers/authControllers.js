const User = require('../models/userModel')
const Worker = require('../models/WorkerSchema')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const createError = require('../utils/appError')
const Admin = require('../models/AdminSchema')


// Generate JWT token
const generateToken = user => {
    return jwt.sign({ id: user._id, role: user.role },
        process.env.JWT_SECRET,
        {
            expiresIn: '15d'
        })
}


// Register User
exports.signup = async (req, res) => {

    const { email, password, name, role, photo, gender, phone } = req.body;

    try {

        let user = null;

        if (role === 'patient') {
            user = await User.findOne({ email })
        }
        else if (role === 'worker') {
            user = await Worker.findOne({ email })
        }
        else if (role === 'admin') {
            user = await User.findOne({ email })
        }


        // check if user already exists
        if (user) {
            return res.status(400).json({ message: 'User already exists' })
        }

        // hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (role === 'patient') {
            user = new User({
                name,
                email,
                password: hashedPassword,
                photo,
                gender,
                role,
                phone,
            });
        }


        if (role === 'worker') {
            user = new Worker({
                name,
                email,
                password: hashedPassword,
                photo,
                gender,
                role,
            });
        }

        if (role === 'admin') {
            user = new Admin({
                name,
                email,
                password: hashedPassword,
                photo,
                gender,
                role,
            });
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'User registered successfully',
        })


    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error, Try again',
        });
    }
}

// // LOGGING USER
// exports.login = async (req, res) => {
//     const { email } = req.body;
//     try {

//         let user = null;

//         const patient = await User.findOne({ email });
//         const worker = await Worker.findOne({ email });
//         const admin = await Admin.findOne({ email });

//         if (patient) {
//             user = patient;
//         }
//         if (worker) {
//             user = worker;
//         }
//         if (admin) {
//             user = admin;
//         }

//         // check if user exits or not
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         // compare password
//         const isPasswordMatch = await bcrypt.compare(
//             req.body.password,
//             user.password);

//         if (!isPasswordMatch) {
//             return res.status(400).json({
//                 status: false,
//                 message: 'Invalid credentials'
//             });
//         }

//         // get token
//         const token = generateToken(user);

//         const { password, role, appointments, ...rest } = user._doc;

//         res
//             .status(200)
//             .json({ status: true, message: 'logged in successful', token, data: { ...rest }, role, });


//     } catch (error) {
//         res.status(500).json({ status: false, message: 'Failed to login' });

//     }

// };


// 1) Add lockout configuration and helper at the top (outside of exports.login):
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
  
  // 2) Now your existing login function. Notice we only ADD lines, not remove/modify your existing ones.
  exports.login = async (req, res) => {
    const { email } = req.body;
  
    try {
      let user = null;
  
      const patient = await User.findOne({ email });
      const worker = await Worker.findOne({ email });
      const admin = await Admin.findOne({ email });
  
      if (patient) {
        user = patient;
      }
      if (worker) {
        user = worker;
      }
      if (admin) {
        user = admin;
      }
  
      // check if user exits or not
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // ----------------- NEW CODE START: Check if user is locked -----------------
      if (user.isLocked) {
        // If lock time has passed, remove the lock but do NOT reset the attempts
        if (user.lockUntil <= Date.now()) {
          user.lockUntil = null;
          await user.save(); // note we're NOT resetting user.loginAttempts
        } else {
          // If the user is still locked, let them know how much time remains
          const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000);
          return res.status(403).json({
            message: 'Account is locked due to multiple failed login attempts.',
            remainingTime,
          });
        }
      }
      // ----------------- NEW CODE END: Check if user is locked -----------------
  
      // compare password (existing)
      const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
  
      // ----------------- NEW CODE START: Handle incorrect password (increment attempts) -----------------
      if (!isPasswordMatch) {
        // Increment the loginAttempts
        user.loginAttempts = (user.loginAttempts || 0) + 1;
  
        // Determine if we need to lock the user based on updated attempts
        const lockTime = getLockTime(user.loginAttempts);
        // If user has at least 5 attempts, apply a lock
        if (lockTime > 0 && user.loginAttempts >= LOCKOUT_CONFIG[0].attempts) {
          user.lockUntil = Date.now() + lockTime;
          await user.save();
          return res.status(403).json({
            status: false,
            message: 'Account locked due to multiple failed login attempts.',
            remainingTime: lockTime / 1000, // Lock time in seconds
          });
        }
  
        await user.save();
        return res.status(400).json({
          status: false,
          message: 'Invalid credentials',
          remainingAttempts:
            (LOCKOUT_CONFIG.find((config) => user.loginAttempts <= config.attempts)?.attempts ?? 0) -
            user.loginAttempts,
        });
      }
      // ----------------- NEW CODE END: Handle incorrect password (increment attempts) -----------------
  
      // If password is correct, reset attempts & lock (existing + new)
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
  
      // get token (existing)
      const token = generateToken(user);
  
      // existing destructure
      const { password, role, appointments, ...rest } = user._doc;
  
      // existing response
      res
        .status(200)
        .json({ status: true, message: 'logged in successful', token, data: { ...rest }, role });
    } catch (error) {
      res.status(500).json({ status: false, message: 'Failed to login' });
    }
  };
  


// Get Token by User ID
exports.getTokenById = async (req, res) => {
    const { id } = req.body;

    try {
        let user = null;

        const patient = await User.findById(id);
        const worker = await Worker.findById(id);
        const admin = await Admin.findById(id);

        if (patient) {
            user = patient;
        }
        if (worker) {
            user = worker;
        }
        if (admin) {
            user = admin;
        }

        // check if user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // generate token
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