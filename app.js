const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDatabase = require('./config/database');
const whatsappRoutes = require('./routes/whatsapp');
const whatsappService = require('./services/whatsappClient');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use('/api/whatsapp', whatsappRoutes);

// Database connection
const databaseUrl = process.env.MONGODB_URI || "mongodb+srv://gaizkavalencia1:4fkgNiGinUvTiPr0@cluster0.p0ajoom.mongodb.net/databaseWABoba?retryWrites=true&w=majority&appName=Cluster0";

const startServer = async () => {
    try {
        await connectDatabase(databaseUrl);
        
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, async () => {
            console.log(`Server is running on port ${PORT}`);
            await whatsappService.initializeExistingSessions();
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();