const Booking = require('../models/BookingSchema');
const Worker = require('../models/WorkerSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

exports.updateWorker = async (req, res) => {
    const id = req.params.id;
    const { password, ...restBody } = req.body; // Destructure password from req.body

    // Check if id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid worker ID"
        });
    }

    // Clone req.body and remove the email field
    const updateData = { ...req.body };
    delete updateData.email;
    

    try {

        // Hash the password if present in the request body
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateData.password = hashedPassword;
        }

        const updatedWorker = await Worker.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedWorker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Worker updated successfully",
            data: updatedWorker
        });

    } catch (err) {
        console.error("Error updating worker:", err);
        res.status(500).json({
            success: false,
            message: "Failed to update worker",
            error: err.message
        });
    }
};

exports.deleteWorker = async (req, res) => {
    const id = req.params.id;

    try {
        const deletedWorker = await Worker.findByIdAndDelete(id);

        if (!deletedWorker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Worker deleted successfully"
        });

    } catch (err) {
        console.error("Error deleting worker:", err);
        res.status(500).json({
            success: false,
            message: "Failed to delete",
            error: err.message
        });
    }
};

exports.getSingleWorker = async (req, res) => {
    const id = req.params.id;

    try {
        const worker = await Worker.findById(id)
        .populate('reviews')
        .select('-password');

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Worker found",
            data: worker
        });

    } catch (err) {
        console.error("Error finding worker:", err);
        res.status(500).json({
            success: false,
            message: "No worker found",
            error: err.message
        });
    }
};

exports.getAllWorker = async (req, res) => {
    try {

        const { query } = req.query;
        let workers;

        if (query) {
            workers = await Worker.find({
                isApproved: "approved",
                $or: [{ name: { $regex: query, $options: 'i' }},
                    { specialization: { $regex: query, $options: 'i' }}, 
                ]
            }).select('-password');
        }else{
            workers = await Worker.find().select('-password');
        }


        res.status(200).json({
            success: true,
            message: "Workers found",
            data: workers
        });

    } catch (err) {
        console.error("Error finding workers:", err);
        res.status(500).json({
            success: false,
            message: "Not found",
            error: err.message
        });
    }
};


exports.getWorkerProfile = async (req, res) => {
    const workerId = req.userId

    try {
        const worker = await Worker.findById(workerId)

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }
        
        const { password, ...rest} = worker._doc;
        const appointments = await Booking.find({worker: workerId})

        res.status(200).json({
            success: true,
            message: "Worker profile fetched successfully",
            data: {...rest, appointments}
        });
    
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch worker profile",
            error: error.message
        });
    }
}


exports.approveWorker = async (req, res) => {
    const id = req.params.id;

    // Check if id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid worker ID"
        });
    }

    try {
        const updatedWorker = await Worker.findByIdAndUpdate(
            id,
            { $set: { isApproved: "approved" } },
            { new: true, runValidators: true }
        );

        if (!updatedWorker) {
            return res.status(404).json({
                success: false,
                message: "Worker not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Worker approved successfully",
            data: updatedWorker
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Failed to approve worker",
            error: err.message
        });
    }
};