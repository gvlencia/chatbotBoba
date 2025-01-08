const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');

const connectDatabase = async (databaseUrl) => {
    try {
        await mongoose.connect(databaseUrl, { 
            serverSelectionTimeoutMS: 5000 
        });
        console.log('Connected to MongoDB databaseWABoba');
        
        return new MongoStore({ mongoose: mongoose });
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        throw err;
    }
};

module.exports = connectDatabase;