
const express = require('express');
const { getAllReviews, createReview } = require('../controllers/reviewController');
const { authenticate, restrict } = require('../auth/verifyToken.js');

const router = express.Router({mergeParams: true});


// Review Routes
router
.route('/')
.get(getAllReviews)
.post(authenticate, restrict(['patient']), createReview);

module.exports = router;