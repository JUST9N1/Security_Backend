const express = require('express');
const authController = require('../controllers/authControllers');

const router = express.Router();


// Auth Routes
router.post('/signup', authController.signup);

router.post('/login', authController.login);

router.post('/get-token', authController.getTokenById);

router.post('/forgot_password', authController.forgotPassword);

router.post('/reset_password', authController.resetPassword)

module.exports = router;