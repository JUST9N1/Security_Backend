const express = require('express');
const router = express.Router();

const {
    getSingleWorker,
    getAllWorker,
    updateWorker,
    deleteWorker,
    getWorkerProfile,
    approveWorker
} = require('../controllers/workerController.js');

const { authenticate, restrict } = require('../auth/verifyToken.js');
const reviewRouter = require('./review.js');

// nested route
router.use('/:workerId/reviews', reviewRouter);

// Define your routes using the destructured functions
router.get('/:id', getSingleWorker);
router.get('/', getAllWorker);
router.put('/:id', authenticate,restrict(["worker", "admin"]), updateWorker);
router.put('/:id', restrict(["admin", "worker"]), updateWorker);
router.delete('/:id', authenticate, restrict(["worker"]), deleteWorker);

router.get('/profile/me', authenticate, restrict(["worker"]), getWorkerProfile);


// Admin-only route to approve workers
router.patch('/approve-worker/:id', authenticate, restrict(["admin"]), approveWorker);

module.exports = router;
