
const mongoose = require('mongoose')
const dotenv = require('dotenv')

// Configuring dotenv
dotenv.config()


// External file
// Functions(Connection)
// Make a unique function name
// Export 

const connectDatabase = () => {
    mongoose.connect(process.env.MONGODB_LOCAl).then(() => {
        console.log("Database Connected!");
    })
        .catch((err) => {
            console.error("Database connection error:", err);
        });
};


// Exporting the function   
module.exports = connectDatabase;

