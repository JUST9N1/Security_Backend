const express = require('express');
const router = express.Router();

const { getAdminProfile, updateAdmin } = require('../controllers/adminControllers.js');
const { authenticate, restrict } = require('../auth/verifyToken.js');

// Define your routes using the destructured functions
router.get('/profile/me', authenticate, restrict(["admin"]), getAdminProfile);
router.put('/:id', authenticate, restrict(["admin"]), updateAdmin);



module.exports = router;


